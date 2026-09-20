"""copy the Claude Code session index from one profile to another.

only the index moves; transcripts live in one shared store every profile reads.

deliberately not copied:

``scheduled-tasks.json``: the target writes its own
``git-worktrees.json``: holds paths into the source profile's scratch workspaces
``claude-code/``, ``claude-code-vm/``, ``local-agent-mode-sessions/``: rebuilt on launch
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path
from typing import Any

from .. import Abort
from ..index import read_json, session_scope
from ..paths import cli_projects, default_profile, profile_is_running, resolve_profile
from ..staging import new_run, write_manifest

SHADOW_DIR = "git-shadow"


def run_migrate(args: argparse.Namespace) -> int:
    source = resolve_profile(args.source) if args.source else default_profile()
    target = resolve_profile(args.to)
    for label, path in (("source", source), ("target", target)):
        if not path.is_dir():
            raise Abort(f"{label} profile not found: {path}")
    source, target = source.resolve(), target.resolve()
    if source == target:
        raise Abort("source and target are the same directory")
    if profile_is_running(target):
        raise Abort("a Claude instance is running on the target profile; quit it first")

    src_scope, dst_scope = session_scope(source), session_scope(target)
    files = sorted(src_scope.glob("local_*.json"))
    if not files:
        raise Abort(f"no local_*.json session files in {src_scope}")

    shadows = sorted(p for p in (source / SHADOW_DIR).glob("*") if p.is_dir())

    print("Claude Code session migration\n")
    print(f"  from : {source}\n         {src_scope.parent.name}/{src_scope.name}")
    print(f"  to   : {target}\n         {dst_scope.parent.name}/{dst_scope.name}")
    same = src_scope.parent.name == dst_scope.parent.name and src_scope.name == dst_scope.name
    print(f"         ({'same account' if same else 'different account, remapping paths'})")

    print(f"\n  {len(files)} session(s) to copy:")
    for path in files:
        entry = read_json(path) or {}
        overwrites = " [OVERWRITES EXISTING]" if (dst_scope / path.name).exists() else ""
        print(f"    {path.name}{overwrites}")
        print(f"      title {entry.get('title') or '<none>'}")
        print(f"      cwd   {entry.get('cwd') or '<none>'}")
    print(f"\n  {len(shadows)} shadow git repo(s) to copy")

    if args.dry_run:
        print("\nDry run, nothing written.")
        return 0
    if not args.yes and not _confirm():
        print("Aborted.")
        return 0

    run = new_run("migrate", args.staging)
    records: list[dict[str, Any]] = []

    dst_scope.mkdir(parents=True, exist_ok=True)
    print("\nCopying:")
    for path in files:
        dest = dst_scope / path.name
        backup = None
        if dest.exists():
            backup = run / "replaced" / dest.name
            backup.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(dest, backup)
        shutil.copy2(path, dest)
        records.append(
            {"path": str(dest), "backup": str(backup) if backup else None, "title": path.name}
        )
        print(f"  {path.name}")

    for shadow in shadows:
        dest = target / SHADOW_DIR / shadow.name
        if dest.exists():
            print(f"  {SHADOW_DIR}/{shadow.name} already present, left alone")
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(shadow, dest)
        records.append({"path": str(dest), "backup": None, "title": f"{SHADOW_DIR}/{shadow.name}"})
        print(f"  {SHADOW_DIR}/{shadow.name}")

    write_manifest(run, "migrate", target, records, source=str(source))

    print("\nValidating:")
    ok = _validate(files, dst_scope)
    print(f"\nUndo this run:\n  claude-profiles undo {run}")
    return 0 if ok else 1


def _confirm() -> bool:
    if not sys.stdin.isatty():
        raise Abort("not a terminal; pass --yes to run non-interactively")
    return input("\nProceed? [y/N] ").strip().lower().startswith("y")


def _validate(files: list[Path], dst_scope: Path) -> bool:
    """each entry landed, parses, and points at a transcript that exists."""
    ok = True
    for path in files:
        dest = dst_scope / path.name
        if not dest.is_file():
            print(f"  FAIL {path.name} not copied")
            ok = False
            continue
        entry = read_json(dest)
        if entry is None:
            print(f"  FAIL {path.name} is not valid JSON at the target")
            ok = False
            continue
        cli_id = entry.get("cliSessionId")
        if not isinstance(cli_id, str):
            print(f"  WARN {path.name} has no cliSessionId, cannot check transcript")
        elif any(cli_projects().glob(f"*/{cli_id}.jsonl")):
            print(f"  ok   {path.name}")
        else:
            print(f"  WARN {path.name} transcript {cli_id} missing from {cli_projects()}")
    return ok
