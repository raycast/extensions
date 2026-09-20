"""fixtures building a throwaway home directory that looks like a real one."""

from __future__ import annotations

import json
import uuid
from pathlib import Path

import pytest

from claude_profiles import paths
from claude_profiles.transcripts import slug_for

ACCOUNT = "acct-0000"
ORG = "org-0000"


@pytest.fixture(autouse=True)
def home(tmp_path, monkeypatch):
    """redirect every location the package resolves."""
    monkeypatch.setenv("HOME", str(tmp_path))
    for var in ("XDG_CONFIG_HOME", "XDG_DATA_HOME", "XDG_STATE_HOME"):
        monkeypatch.delenv(var, raising=False)
    (tmp_path / ".claude" / "projects").mkdir(parents=True)
    return tmp_path


def dump(obj: dict) -> str:
    """compact, the way the CLI and the app write these files."""
    return json.dumps(obj, separators=(",", ":"))


def write_settings(default_mode: str | None) -> None:
    body = {"permissions": {"defaultMode": default_mode}} if default_mode else {}
    paths.cli_settings().write_text(json.dumps(body))


def user_turn(text: str, cwd: str, stamp: str, session_id: str) -> dict:
    return {
        "type": "user",
        "sessionId": session_id,
        "cwd": cwd,
        "timestamp": stamp,
        "message": {"role": "user", "content": [{"type": "text", "text": text}]},
    }


def assistant_turn(cwd: str, stamp: str, session_id: str, model: str = "claude-opus-5") -> dict:
    return {
        "type": "assistant",
        "sessionId": session_id,
        "cwd": cwd,
        "timestamp": stamp,
        "effort": "high",
        "message": {"role": "assistant", "model": model, "content": []},
    }


def make_transcript(
    cwd: str = "/work/project",
    turns: tuple[str, ...] = ("hello", "and again"),
    title: str | None = "A session",
    session_id: str | None = None,
    subagents: int = 0,
) -> Path:
    """write a CLI transcript the way the CLI would, and return its path."""
    session_id = session_id or str(uuid.uuid4())
    folder = paths.cli_projects() / slug_for(cwd)
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{session_id}.jsonl"

    lines: list[dict] = []
    for n, text in enumerate(turns):
        stamp = f"2026-01-0{n + 1}T10:00:00.000Z"
        lines.append(user_turn(text, cwd, stamp, session_id))
        lines.append(assistant_turn(cwd, stamp, session_id))
    if title:
        lines.append({"type": "custom-title", "customTitle": title, "sessionId": session_id})
    path.write_text("\n".join(dump(line) for line in lines) + "\n")

    for n in range(subagents):
        side = folder / session_id / "subagents"
        side.mkdir(parents=True, exist_ok=True)
        (side / f"agent-{n}.jsonl").write_text(
            dump(
                {
                    "type": "user",
                    "sessionId": session_id,
                    "agentId": f"agent-{n}",
                    "isSidechain": True,
                    "promptId": "prompt-1",
                    "cwd": cwd,
                    "timestamp": "2026-01-01T10:00:00.000Z",
                    "message": {"role": "user", "content": [{"type": "text", "text": "sub"}]},
                }
            )
            + "\n"
        )
    return path


def command_transcript(command: str, cwd: str = "/work/project") -> Path:
    """a session whose only content is one slash command, as the CLI records it."""
    session_id = str(uuid.uuid4())
    folder = paths.cli_projects() / slug_for(cwd)
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{session_id}.jsonl"
    stamp = "2026-01-01T10:00:00.000Z"
    texts = (
        "<local-command-caveat>Caveat</local-command-caveat>",
        f"<command-message>run</command-message><command-name>{command}</command-name>",
        "<local-command-stdout>done</local-command-stdout>",
    )
    path.write_text("\n".join(dump(user_turn(t, cwd, stamp, session_id)) for t in texts) + "\n")
    return path


TEMPLATE = {
    "sessionId": "local_template",
    "cliSessionId": "template-cli-id",
    "cwd": "/template/folder",
    "originCwd": "/template/folder",
    "createdAt": 1,
    "lastActivityAt": 2,
    "lastFocusedAt": 3,
    "title": "Template session",
    "titleSource": "auto",
    "model": "claude-sonnet-5",
    "effort": "medium",
    "completedTurns": 9,
    "permissionMode": "bypassPermissions",
    "chromePermissionMode": "skip_all_permission_checks",
    "alwaysAllowedReasons": ["a granted reason"],
    "sessionPermissionUpdates": [{"tool": "Bash"}],
    "priorCliSessionIds": ["some-earlier-id"],
    "remoteMcpServersConfig": [{"name": "figma"}],
    "error": "rate limit reached",
    "errorAt": 12345,
    "promptAppendSnapshot": {"append": "", "cliVersion": "2.0", "cwd": "/template/folder"},
    "aFutureFieldTheAppAdded": {"kept": True},
}


def make_profile(name: str = "personal", entries: list[dict] | None = None) -> Path:
    """a signed-in profile directory with an <account>/<org> scope."""
    profile = paths.profiles_root() / name
    scope = profile / "claude-code-sessions" / ACCOUNT / ORG
    scope.mkdir(parents=True, exist_ok=True)
    for entry in entries or []:
        (scope / f"{entry['sessionId']}.json").write_text(json.dumps(entry))
    return profile


def template_entry(**overrides) -> dict:
    return {**TEMPLATE, **overrides}


def read_entries(profile: Path) -> list[dict]:
    scope = profile / "claude-code-sessions" / ACCOUNT / ORG
    return [json.loads(p.read_text()) for p in sorted(scope.glob("local_*.json"))]
