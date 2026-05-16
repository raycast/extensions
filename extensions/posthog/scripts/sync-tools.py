#!/usr/bin/env python3
"""
Regenerate the `tools` array in package.json from src/tools/_definitions.json.

Run after refreshing _definitions.json from PostHog/mcp:

    gh api 'repos/PostHog/mcp/contents/schema/tool-definitions.json' --jq '.content' \\
      | base64 -d > src/tools/_definitions.json
    python3 scripts/sync-tools.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


SMALL_WORDS = {"a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "of", "on", "or", "the", "to", "with"}


def title_case(value: str) -> str:
    parts = re.split(r"(\s+)", value)
    out: list[str] = []
    for index, part in enumerate(parts):
        if part.isspace():
            out.append(part)
            continue
        word = part
        if index > 0 and word.lower() in SMALL_WORDS:
            out.append(word.lower())
        elif word.isupper() and len(word) <= 4:
            # Preserve short all-caps acronyms (LLM, SQL, AI, ID, URL).
            out.append(word)
        else:
            out.append(word[0].upper() + word[1:])
    return "".join(out)


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    defs_path = root / "src" / "tools" / "_definitions.json"
    pkg_path = root / "package.json"

    if not defs_path.exists():
        print(f"Missing {defs_path}. Run `gh api ... > {defs_path}` first.", file=sys.stderr)
        return 1

    defs = json.loads(defs_path.read_text())
    pkg = json.loads(pkg_path.read_text())

    pkg["tools"] = [
        {"name": name, "title": title_case(spec["title"]), "description": spec["summary"]}
        for name, spec in sorted(defs.items())
    ]

    pkg_path.write_text(json.dumps(pkg, indent=2) + "\n")
    print(f"Wrote {len(pkg['tools'])} tools.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
