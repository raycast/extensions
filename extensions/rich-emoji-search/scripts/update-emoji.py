#!/usr/bin/env python3
"""Regenerate src/emoji.json from the upstream rich emoji table.

    python3 scripts/update-emoji.py

Reads rich/_emoji_codes.py straight from GitHub so no rich install is needed.
The file is a single `EMOJI = {...}` literal, so it can be parsed with ast
rather than executed.
"""

import ast
import json
import urllib.request
from pathlib import Path

# rich renamed its default branch to `main` in June 2026. `master` still serves
# via GitHub's legacy redirect, but it is no longer a branch, so don't rely on it.
SOURCE = "https://raw.githubusercontent.com/Textualize/rich/main/rich/_emoji_codes.py"
DESTINATION = Path(__file__).resolve().parent.parent / "src" / "emoji.json"


def main() -> None:
    with urllib.request.urlopen(SOURCE) as response:
        source = response.read().decode("utf-8")

    module = ast.parse(source)
    assignment = module.body[0]
    if not isinstance(assignment, ast.Assign):
        raise SystemExit(f"unexpected module layout in {SOURCE}")

    emoji = ast.literal_eval(assignment.value)
    # `npm run update-data` runs Prettier over the result, which is what keeps
    # `ray lint` happy — don't hand-tune the formatting here.
    DESTINATION.write_text(
        json.dumps(emoji, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"wrote {len(emoji)} emojis to {DESTINATION}")


if __name__ == "__main__":
    main()
