"""reverse a previous run from its manifest.

only files a run created are deleted, and only entries it replaced are
restored. a source transcript is never touched; it is re-hashed and reported.
"""

from __future__ import annotations

import argparse
import shutil
from collections.abc import Callable
from pathlib import Path
from typing import Any

from .. import Abort
from ..staging import read_manifest, runs, save_manifest, sha256


def _undo_import(rec: dict[str, Any]) -> None:
    entry = Path(rec["indexEntry"])
    if entry.exists():
        entry.unlink()
        print("  removed index")
    else:
        print("  index already gone")

    backup, target = rec.get("replacedEntryBackup"), rec.get("replacedEntryPath")
    if backup and target:
        backup_path, target_path = Path(backup), Path(target)
        if not backup_path.is_file():
            print(f"  WARN backup missing, cannot restore {target_path.name}")
        elif target_path.exists():
            print(f"  kept existing {target_path.name}, already back in place")
        else:
            shutil.copy2(backup_path, target_path)
            print(f"  restored index {target_path.name}")

    published = rec.get("publishedTranscript")
    # only a published copy is deleted, never the original.
    if published and published != rec["originalTranscript"] and Path(published).exists():
        Path(published).unlink()
        print(f"  removed copy {Path(published).name}")
        agents = rec.get("publishedSubagents")
        if agents and Path(agents).is_dir():
            shutil.rmtree(Path(agents).parent)
            print(f"  removed subagents {Path(agents).parent.name}/")

    original = Path(rec["originalTranscript"])
    if original.is_file() and sha256(original) == rec["originalSha256"]:
        print(f"  ok original intact {original.name}")
    else:
        print(f"  WARN original changed or missing: {original}")


def _undo_optimize(rec: dict[str, Any]) -> None:
    target, backup = Path(rec["indexEntry"]), Path(rec["backup"])
    if backup.is_file():
        shutil.copy2(backup, target)
        print("  restored entry")
    else:
        print(f"  WARN backup missing: {target.name}")


def _undo_migrate(rec: dict[str, Any]) -> None:
    """restore what a copy displaced, or remove what it created."""
    target, backup = Path(rec["path"]), rec.get("backup")
    if backup:
        shutil.copy2(Path(backup), target)
        print("  restored what it replaced")
    elif target.is_dir():
        shutil.rmtree(target)
        print("  removed copied directory")
    elif target.is_file():
        target.unlink()
        print("  removed copied file")
    else:
        print("  already gone")


UNDO: dict[str, Callable[[dict[str, Any]], None]] = {
    "import": _undo_import,
    "migrate": _undo_migrate,
    "optimize": _undo_optimize,
}


def run_undo(args: argparse.Namespace) -> int:
    if args.list:
        found = runs()
        if not found:
            print("No runs recorded.")
            return 0
        for run in found:
            data = read_manifest(run)
            print(f"{run}  {data['kind']:9} {len(data['records'])} record(s)  {data['createdAt']}")
        return 0

    if args.last:
        found = runs()
        if not found:
            raise Abort("no runs recorded")
        run = found[0]
    elif args.run:
        run = args.run.expanduser().resolve()
    else:
        raise Abort("pass a run directory, --last, or --list")

    manifest = read_manifest(run)
    records = manifest["records"]
    if not records:
        raise Abort(f"{run} lists no records")

    if args.only:
        wanted = set(args.only)
        known = {
            v
            for rec in records
            for v in (rec.get("sessionId"), rec.get("cliSessionId"), rec.get("sourceCliSessionId"))
            if v
        }
        unknown = wanted - known
        if unknown:
            raise Abort(f"not in this manifest: {', '.join(sorted(unknown))}")
        selected = [r for r in records if wanted & {
            r.get("sessionId"), r.get("cliSessionId"), r.get("sourceCliSessionId")
        }]  # fmt: skip
    else:
        selected = records

    undo_one = UNDO.get(manifest["kind"])
    if not undo_one:
        raise Abort(f"unknown run kind {manifest['kind']!r} in {run}")
    print(f"Undoing {len(selected)} of {len(records)} {manifest['kind']} record(s) from {run}\n")
    for rec in selected:
        print(f"  {rec['title'][:60]}")
        undo_one(rec)
        print()

    kept = [r for r in records if r not in selected]
    manifest["records"] = kept
    manifest.setdefault("undone", []).extend(selected)
    save_manifest(run, manifest)
    print(f"{len(selected)} undone, {len(kept)} still active in this manifest.")
    return 0
