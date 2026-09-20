"""clean stale state out of index entries a profile already has. never reads a
transcript, never creates or deletes a conversation; only entries this tool
generated are touched unless ``--include-app-written`` is set.

``--clear-errors``: drops error, errorAt and priorErrorMark left by a rate limit
``--clear-connectors``: resets the cached remoteMcpServersConfig snapshot
``--relocate-scratch DIR``: repoints an entry off an emptied scratch workspace
"""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path
from typing import Any

from .. import Abort
from ..index import (
    NEUTRAL,
    STALE_RUN_STATE,
    entries,
    is_scratch,
    read_json,
    retarget_cwd,
    session_scope,
)
from ..paths import profile_is_running, resolve_profile
from ..staging import new_run, read_manifest, runs, write_manifest

CONNECTOR_FIELD = "remoteMcpServersConfig"


def generated_entries(profile: Path) -> set[str]:
    """entry filenames an import created here, per its run manifests."""
    out: set[str] = set()
    for run in runs():
        try:
            data = read_manifest(run)
        except Abort:
            continue
        if data.get("kind") != "import" or Path(data.get("profile", "")) != profile:
            continue
        out.update(Path(rec["indexEntry"]).name for rec in data["records"])
    return out


def survey(scope: Path, generated: set[str], include_app: bool) -> list[dict[str, Any]]:
    rows = []
    for path, entry in entries(scope):
        origin = "tool" if path.name in generated else "app"
        if origin == "app" and not include_app:
            continue
        config = entry.get(CONNECTOR_FIELD)
        rows.append(
            {
                "path": path,
                "entry": entry,
                "origin": origin,
                "title": entry.get("title") or "(untitled)",
                "stale": [k for k in STALE_RUN_STATE if k in entry],
                "connectorBytes": len(json.dumps(config)) if config else 0,
                "isScratch": is_scratch(entry.get("cwd")),
            }
        )
    return rows


def run_optimize(args: argparse.Namespace) -> int:
    wants = (args.clear_errors, args.clear_connectors, bool(args.relocate_scratch))
    if not any(wants):
        raise Abort("pick at least one of --clear-errors, --clear-connectors, --relocate-scratch")

    profile = resolve_profile(args.to)
    if not profile.is_dir():
        raise Abort(f"profile not found: {profile}")
    if profile_is_running(profile):
        raise Abort("a Claude instance is running on that profile; quit it first")

    scope = session_scope(profile)
    rows = survey(scope, generated_entries(profile), args.include_app_written)
    if args.only:
        wanted = set(args.only)
        rows = [
            r
            for r in rows
            if wanted & {r["path"].stem, r["path"].name, str(r["entry"].get("cliSessionId"))}
        ]
        if not rows:
            raise Abort(f"no entries matched: {', '.join(sorted(wanted))}")

    plan: dict[Path, tuple[dict[str, Any], set[str]]] = {}

    def add(row: dict[str, Any], action: str) -> None:
        plan.setdefault(row["path"], (row, set()))[1].add(action)

    for row in rows:
        if args.clear_errors and row["stale"]:
            add(row, "errors")
        if args.clear_connectors and row["connectorBytes"]:
            add(row, "connectors")
        if args.relocate_scratch and row["isScratch"]:
            add(row, "scratch")

    print("Claude Desktop profile optimize\n")
    print(f"  profile : {profile}")
    print(f"  scope   : {scope.parent.name}/{scope.name}")
    tool = sum(1 for r in rows if r["origin"] == "tool")
    print(f"  entries : {len(rows)} reviewed ({tool} generated, {len(rows) - tool} app-written)")

    if not plan:
        print("\nNothing to change.")
        return 0

    print(f"\n  {len(plan)} entr(ies) to change:")
    for row, actions in plan.values():
        print(f"    {row['title'][:46]:48} {', '.join(sorted(actions))}")

    if args.dry_run:
        print("\nDry run, nothing written.")
        return 0

    run = new_run("optimize", args.staging)
    (run / "original").mkdir(parents=True, exist_ok=True)
    records = []
    for row, actions in plan.values():
        path, entry = row["path"], row["entry"]
        backup = run / "original" / path.name
        shutil.copy2(path, backup)

        changed = []
        if "errors" in actions:
            changed += [k for k in STALE_RUN_STATE if entry.pop(k, None) is not None]
        if "connectors" in actions:
            entry[CONNECTOR_FIELD] = list(NEUTRAL[CONNECTOR_FIELD])
            changed.append(CONNECTOR_FIELD)
        moved_from = None
        if "scratch" in actions:
            moved_from = entry.get("cwd")
            target = str(args.relocate_scratch.expanduser())
            entry = retarget_cwd(entry, target)
            entry["cwd"] = entry["originCwd"] = target
            changed += ["cwd", "originCwd"]

        path.write_text(json.dumps(entry))
        records.append(
            {
                "indexEntry": str(path),
                "backup": str(backup),
                "title": row["title"],
                "actions": sorted(actions),
                "changedFields": changed,
                "movedFrom": moved_from,
            }
        )

    write_manifest(run, "optimize", profile, records, scope=str(scope))

    print("\nValidating:")
    ok = True
    for rec in records:
        if read_json(Path(rec["indexEntry"])) is None:
            print(f"  FAIL bad JSON {Path(rec['indexEntry']).name}")
            ok = False
        if not Path(rec["backup"]).is_file():
            print(f"  FAIL no backup for {Path(rec['indexEntry']).name}")
            ok = False
    if ok:
        print(f"  ok  {len(records)} entries changed, all valid, all backed up")
    print(f"\nUndo this run:\n  claude-profiles undo {run}")
    return 0 if ok else 1
