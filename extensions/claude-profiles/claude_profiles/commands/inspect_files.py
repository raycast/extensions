"""print the shape of a session file: Claude Desktop's ``local_*.json`` index
entry, or the CLI's ``*.jsonl`` transcript. both schemas are undocumented and
change between app versions; long values are elided and no message body is
printed, so output is safe to paste into an issue.
"""

from __future__ import annotations

import argparse
from collections import Counter
from pathlib import Path
from typing import Any

from .. import Abort
from ..index import read_json
from ..paths import default_profile
from ..transcripts import parse_line


def describe(value: Any) -> str:
    if isinstance(value, bool):
        return f"bool {value}"
    if isinstance(value, str):
        return f"str({len(value)}) {value[:60]!r}..." if len(value) > 60 else f"str {value!r}"
    if isinstance(value, (int, float)):
        return f"num {value}"
    if isinstance(value, list):
        return f"list[{len(value)}] of {describe(value[0])[:50]}" if value else "list[0]"
    if isinstance(value, dict):
        return f"dict keys={list(value)[:8]}"
    return "null" if value is None else type(value).__name__


def report_index(path: Path) -> None:
    entry = read_json(path)
    if entry is None:
        raise Abort(f"not readable JSON: {path}")
    print(f"desktop session index: {path.name}\n")
    for key, value in entry.items():
        print(f"  {key:26} {describe(value)}")


def report_transcript(path: Path) -> None:
    keys: Counter[str] = Counter()
    cwds: Counter[str] = Counter()
    types: Counter[str] = Counter()
    versions: Counter[str] = Counter()
    lines = bad = 0

    with path.open(errors="replace") as fh:
        for raw in fh:
            if not raw.strip():
                continue
            lines += 1
            obj = parse_line(raw)
            if not obj:
                bad += 1
                continue
            keys.update(obj.keys())
            types[str(obj.get("type", "<none>"))] += 1
            for field, counter in (("cwd", cwds), ("version", versions)):
                if isinstance(obj.get(field), str):
                    counter[obj[field]] += 1

    print(f"CLI transcript: {path.name}\nlines: {lines}\n")
    for label, counter in (
        ("line types", types),
        ("cwd values (what a path migration rewrites)", cwds),
        ("CLI versions that wrote this session", versions),
        (f"top-level keys ({len(keys)} distinct)", keys),
    ):
        if not counter:
            continue
        print(f"{label}:")
        for key, n in counter.most_common():
            print(f"  {key:26} {n}")
        print()
    if bad:
        print(f"unparseable lines: {bad}")


def run_inspect(args: argparse.Namespace) -> int:
    target = (args.path or default_profile()).expanduser()

    if target.is_dir():
        found = sorted((target / "claude-code-sessions").glob("*/*/local_*.json"))
        if not found:
            raise Abort(f"no local_*.json under {target}/claude-code-sessions")
        target = found[0]
    if not target.is_file():
        raise Abort(f"not a file: {target}")

    if target.suffix == ".jsonl":
        report_transcript(target)
    elif target.suffix == ".json":
        report_index(target)
    else:
        raise Abort(f"unrecognised file type: {target} (expected .json or .jsonl)")
    return 0
