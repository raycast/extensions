"""The shared Claude Code transcript store at ``~/.claude/projects``.

See docs/session-storage.md.
"""

from __future__ import annotations

import datetime as dt
import json
import re
from collections import Counter
from collections.abc import Callable
from pathlib import Path
from typing import Any

from .index import is_scratch
from .paths import cli_projects

SUBAGENT_DIR = "subagents"

# allowlist on purpose, so an unnamed command counts as real content. /init,
# /rewind, /agents and /mcp are excluded, they write files or change state.
ROTE_COMMANDS = frozenset(
    {
        "/help", "/status", "/usage", "/cost", "/context", "/doctor", "/release-notes",
        "/clear", "/compact", "/exit", "/quit", "/resume",
        "/model", "/theme", "/vim", "/output-style", "/statusline",
        "/privacy-settings", "/rate-limit-options", "/chrome", "/login", "/logout",
    }
)  # fmt: skip

# one slash command becomes three user turns (caveat, command, output), so a
# session holding only /exit reports three turns, not one.
COMMAND_NAME = re.compile(r"<command-name>\s*(/?[\w:.-]+)\s*</command-name>")
COMMAND_SCAFFOLD = ("<local-command-caveat>", "<local-command-stdout>", "<local-command-stderr>")


def slug_for(path: str) -> str:
    """Encode a path the way the CLI names project folders."""
    return re.sub(r"[/_.]", "-", path)


def to_millis(stamp: str) -> int | None:
    try:
        parsed = dt.datetime.fromisoformat(stamp.replace("Z", "+00:00"))
    except ValueError:
        return None
    return int(parsed.timestamp() * 1000)


def top_level_transcripts() -> list[Path]:
    """Every real session transcript, excluding subagent sidechains."""
    return sorted(p for p in cli_projects().glob("*/*.jsonl") if p.is_file())


def subagent_dir_for(transcript: Path) -> Path:
    return transcript.parent / transcript.stem / SUBAGENT_DIR


def subagent_count(transcript: Path) -> int:
    return len(list(subagent_dir_for(transcript).glob("*.jsonl")))


def find_transcript(session_id: str) -> Path | None:
    if session_id.endswith(".jsonl"):
        path = Path(session_id).expanduser()
        return path if path.is_file() else None
    return next((p for p in top_level_transcripts() if p.stem == session_id), None)


def read_lines(path: Path) -> list[dict[str, Any]]:
    out = []
    with path.open(errors="replace") as fh:
        for line in fh:
            obj = parse_line(line)
            if obj:
                out.append(obj)
    return out


def parse_line(line: str) -> dict[str, Any]:
    try:
        obj = json.loads(line)
    except ValueError:
        return {}
    return obj if isinstance(obj, dict) else {}


def message_text(message: Any) -> str:
    """What a turn says, ignoring tool results and images."""
    if not isinstance(message, dict):
        return ""
    content = message.get("content")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(
            b["text"]
            for b in content
            if isinstance(b, dict) and b.get("type") == "text" and isinstance(b.get("text"), str)
        )
    return ""


def classify_content(
    raw: list[str], parse: Callable[[str], dict[str, Any]]
) -> tuple[int, int, list[str]]:
    """Count user turns, count the real ones, and name the commands that ran."""
    turns = 0
    real = 0
    commands: list[str] = []
    for line in raw:
        # cheap substring prefilter, loose by design; the parsed type decides.
        if '"user"' not in line:
            continue
        obj = parse(line)
        if obj.get("type") != "user":
            continue
        turns += 1
        if obj.get("isSidechain"):
            continue
        text = message_text(obj.get("message")).strip()
        if not text or any(marker in text for marker in COMMAND_SCAFFOLD):
            continue
        found = COMMAND_NAME.search(text)
        if found:
            name = found.group(1)
            name = name if name.startswith("/") else "/" + name
            commands.append(name)
            if name in ROTE_COMMANDS:
                continue
        real += 1
    return turns, real, commands


def summarize(transcript: Path) -> dict[str, Any] | None:
    """Cheap metadata for listing and selection."""
    try:
        raw = [ln for ln in transcript.read_text(errors="replace").splitlines() if ln.strip()]
    except OSError:
        return None
    if not raw:
        return None

    stamps = [
        millis
        for line in (raw[0], raw[-1])
        if isinstance(stamp := parse_line(line).get("timestamp"), str)
        and (millis := to_millis(stamp))
    ]

    title = None
    for marker, key in (('"custom-title"', "customTitle"), ('"ai-title"', "aiTitle")):
        for line in reversed(raw):
            if marker in line and (title := parse_line(line).get(key)):
                break
        if title:
            break

    cwd = None
    for line in raw:
        if '"cwd"' in line and (cwd := parse_line(line).get("cwd")):
            break

    turns, real, commands = classify_content(raw, parse_line)
    return {
        "cliSessionId": transcript.stem,
        "path": transcript,
        "title": title or (Path(cwd).name if cwd else transcript.stem[:8]),
        "cwd": cwd,
        "turns": turns,
        "lastActivityAt": max(stamps) if stamps else 0,
        "subagents": subagent_count(transcript),
        "commands": commands,
        "isScratch": is_scratch(cwd),
        "isEmpty": real == 0 and not commands,
        "isRote": real == 0 and bool(commands),
    }


def derive(lines: list[dict[str, Any]], transcript: Path) -> dict[str, Any]:
    """Everything an index entry needs, read out of the transcript itself."""
    stamps = sorted(
        millis
        for line in lines
        if isinstance(stamp := line.get("timestamp"), str) and (millis := to_millis(stamp))
    )
    cwds = Counter(d["cwd"] for d in lines if isinstance(d.get("cwd"), str))
    origin = next((d["cwd"] for d in lines if isinstance(d.get("cwd"), str)), None)

    custom = [d["customTitle"] for d in lines if d.get("type") == "custom-title"]
    ai = [d["aiTitle"] for d in lines if d.get("type") == "ai-title"]
    title = (custom or ai or [None])[-1]

    models = Counter(
        d["message"]["model"]
        for d in lines
        if isinstance(d.get("message"), dict) and isinstance(d["message"].get("model"), str)
    )
    efforts = Counter(d["effort"] for d in lines if isinstance(d.get("effort"), str))

    # origin first: the most common cwd would favor a subdirectory the run
    # stepped into over the session's own launch directory.
    launch = origin or (cwds.most_common(1)[0][0] if cwds else str(Path.home()))

    # filename is authoritative: a sidechain carries its parent's sessionId on
    # every line, so the in-file value would let it masquerade as the parent.
    return {
        "cliSessionId": transcript.stem,
        "isSidechain": SUBAGENT_DIR in transcript.parts
        and all(d.get("isSidechain") for d in lines if "isSidechain" in d),
        "cwd": launch,
        "originCwd": launch,
        "createdAt": stamps[0] if stamps else 0,
        "lastActivityAt": stamps[-1] if stamps else 0,
        "lastFocusedAt": stamps[-1] if stamps else 0,
        "title": title or Path(origin or "session").name,
        "model": models.most_common(1)[0][0] if models else None,
        "effort": efforts.most_common(1)[0][0] if efforts else None,
        "completedTurns": sum(1 for d in lines if d.get("type") == "user"),
    }
