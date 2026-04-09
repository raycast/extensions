#!/usr/bin/env python3
"""Clean prose copied from a terminal and capture feedback as eval data.

Examples:
    >>> sample = "  hello\\n  world\\n\\n  path: /Users/\\n    macbook/test\\n"
    >>> print(clean_text(sample))
    hello world
    <BLANKLINE>
    path: /Users/macbook/test
    <BLANKLINE>
    >>> clean_text("I do not want to over-\\n  engineer this.\\n")
    'I do not want to overengineer this.\\n'
    >>> "pbpaste" in build_cleanpaste_script()
    True
    >>> "@raycast.title Clean Clipboard with TerminalCopyPaste" in build_raycast_script()
    True
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_EVALS_PATH = Path(__file__).with_name("evals.jsonl")


def clean_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n").expandtabs(2)
    lines = text.split("\n")

    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()

    nonempty = [len(re.match(r"^[ \t]*", line).group(0)) for line in lines if line.strip()]
    if nonempty:
        min_indent = min(nonempty)
        if min_indent:
            lines = [line[min_indent:] if line.strip() else "" for line in lines]

    text = "\n".join(lines)
    text = re.sub(r"(\w)-\n\s*(\w)", r"\1\2", text)
    text = re.sub(r"/\n\s*", "/", text)

    paragraphs = re.split(r"\n\s*\n", text)
    cleaned: list[str] = []

    for paragraph in paragraphs:
        paragraph = paragraph.strip()
        if not paragraph:
            continue

        paragraph = re.sub(r"\s*\n\s*", " ", paragraph)
        paragraph = re.sub(r"[ \t]{2,}", " ", paragraph)
        paragraph = re.sub(r"\s+([,.;:?!])", r"\1", paragraph)
        paragraph = re.sub(r"(?<=/)\s+(?=[A-Za-z0-9._-])", "", paragraph)
        cleaned.append(paragraph)

    return "\n\n".join(cleaned).strip() + "\n"


def append_eval(
    raw_text: str,
    cleaned_text: str,
    rating: str,
    feedback: str,
    evals_path: Path,
) -> None:
    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "rating": rating,
        "feedback": feedback,
        "raw": raw_text,
        "cleaned": cleaned_text,
    }
    with evals_path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=True) + "\n")


def build_terminalcopypaste_wrapper(script_path: Path) -> str:
    return f"""#!/bin/zsh
exec /usr/local/bin/python3 "{script_path}" "$@"
"""


def build_cleanpaste_script() -> str:
    return """#!/bin/zsh
set -euo pipefail
pbpaste | "$HOME/bin/terminalcopypaste" "$@" | pbcopy
osascript -e 'display notification "Clipboard cleaned" with title "terminalcopypaste"' >/dev/null 2>&1 || true
echo "clipboard cleaned"
"""


def build_raycast_script() -> str:
    return """#!/bin/zsh
# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Clean Clipboard with TerminalCopyPaste
# @raycast.mode compact
#
# Optional parameters:
# @raycast.packageName TerminalCopyPaste
# @raycast.icon ✂️
# @raycast.argument1 { "type": "text", "placeholder": "Optional feedback" }
# @raycast.argument2 { "type": "dropdown", "placeholder": "Rating", "data": [{"title": "needs_work", "value": "needs_work"}, {"title": "good", "value": "good"}, {"title": "bad", "value": "bad"}] }
#
# Documentation:
# Cleans the clipboard in place. If feedback is provided, the run is appended to evals.jsonl.

set -euo pipefail

feedback="${1:-}"
rating="${2:-needs_work}"

if [[ -n "$feedback" ]]; then
  pbpaste | "$HOME/bin/terminalcopypaste" --feedback "$feedback" --rating "$rating" | pbcopy
else
  pbpaste | "$HOME/bin/terminalcopypaste" | pbcopy
fi

osascript -e 'display notification "Clipboard cleaned" with title "terminalcopypaste"' >/dev/null 2>&1 || true
echo "Clipboard cleaned"
"""


def install(home_dir: Path) -> list[Path]:
    bin_dir = home_dir / "bin"
    raycast_dir = home_dir / ".raycast" / "scripts"
    script_path = Path(__file__).resolve()

    bin_dir.mkdir(parents=True, exist_ok=True)
    raycast_dir.mkdir(parents=True, exist_ok=True)

    targets = {
        bin_dir / "terminalcopypaste": build_terminalcopypaste_wrapper(script_path),
        bin_dir / "cleanpaste": build_cleanpaste_script(),
        raycast_dir / "terminalcopypaste-clipboard.sh": build_raycast_script(),
    }

    written: list[Path] = []
    for path, content in targets.items():
        path.write_text(content, encoding="utf-8")
        path.chmod(0o755)
        written.append(path)

    return written


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Clean terminal-pasted prose and optionally log feedback for evals."
    )
    parser.add_argument(
        "--feedback",
        help="If provided, append a feedback record after cleaning stdin.",
    )
    parser.add_argument(
        "--rating",
        default="needs_work",
        choices=["good", "needs_work", "bad"],
        help="Feedback label used with --feedback.",
    )
    parser.add_argument(
        "--evals-file",
        default=str(DEFAULT_EVALS_PATH),
        help="Path to the JSONL eval log.",
    )
    parser.add_argument(
        "--install",
        action="store_true",
        help="Install global CLI wrappers and a Raycast script command.",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.install:
        for path in install(Path.home()):
            print(f"installed {path}")
        return 0

    raw_text = sys.stdin.read()
    if not raw_text:
        parser.error("stdin is empty")

    cleaned_text = clean_text(raw_text)
    sys.stdout.write(cleaned_text)

    if args.feedback:
        append_eval(
            raw_text=raw_text,
            cleaned_text=cleaned_text,
            rating=args.rating,
            feedback=args.feedback,
            evals_path=Path(args.evals_file),
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
