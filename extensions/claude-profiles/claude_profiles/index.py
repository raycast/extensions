"""Claude Desktop's per-profile session index.

See docs/session-index.md.
"""

from __future__ import annotations

import json
import re
import uuid
from collections import Counter
from pathlib import Path
from typing import Any

from . import Abort
from .paths import cli_settings, profile_roots

# Fields taken from the transcript, not from the template.
DERIVED = frozenset(
    {
        "sessionId",
        "cliSessionId",
        "cwd",
        "originCwd",
        "createdAt",
        "lastActivityAt",
        "lastFocusedAt",
        "title",
        "model",
        "effort",
        "completedTurns",
    }
)

# per-session grants and run state a template must not hand to a new session.
NEUTRAL: dict[str, Any] = {
    "alwaysAllowedReasons": [],
    "sessionPermissionUpdates": [],
    "priorCliSessionIds": [],
    "bridgeSessionIds": [],
    "scratchPromptRecents": [],
    "spawnSeed": {},
    "isArchived": False,
    "lastSpawnRootDetected": False,
    # doesn't follow a later disconnect, so a copied one can name a connector
    # the account no longer has.
    "remoteMcpServersConfig": [],
}

# dropped rather than emptied: an entry with no error omits these keys entirely.
STALE_RUN_STATE = ("error", "errorAt", "priorErrorMark")

# recovered from the app bundle by tools/permission-audit.sh, not invented.
CONSERVATIVE = {"permissionMode": "ask", "chromePermissionMode": "always_ask"}
PERMISSION_FIELDS = tuple(CONSERVATIVE)

STRUCTURAL_KEYS = ("cwd", "originCwd")

# matches the scratch-workspaces path the app generates for a folderless chat.
SCRATCH_WORKSPACE = re.compile(
    r"[/\\]scratch-workspaces[/\\][^/\\]+[/\\][^/\\]+[/\\]"
    r"scratch-\d{4}-\d{2}-\d{2}-[0-9a-f]{6}(?:[/\\]|$)"
)


def is_scratch(cwd: str | None) -> bool:
    return bool(cwd and SCRATCH_WORKSPACE.search(cwd))


def read_json(path: Path) -> dict[str, Any] | None:
    try:
        data = json.loads(path.read_text())
    except (OSError, ValueError):
        return None
    return data if isinstance(data, dict) else None


def session_scope(profile: Path) -> Path:
    """The account/org directory holding a profile's index entries."""
    base = profile / "claude-code-sessions"
    if not base.is_dir():
        raise Abort(f"{profile} has no claude-code-sessions/; sign in to that profile first")
    dirs = sorted(p for p in base.glob("*/*") if p.is_dir())
    if not dirs:
        raise Abort(f"{profile} has no <account>/<org> directory; sign in to that profile first")
    if len(dirs) > 1:
        raise Abort(f"{profile} holds {len(dirs)} accounts; migrate manually to avoid guessing")
    return dirs[0]


def all_session_scopes() -> list[Path]:
    """Every scope on this machine, across every profile."""
    scopes = []
    for root in profile_roots():
        base = root / "claude-code-sessions"
        if base.is_dir():
            scopes.extend(sorted(p for p in base.glob("*/*") if p.is_dir()))
    return scopes


def entries(scope: Path) -> list[tuple[Path, dict[str, Any]]]:
    out = []
    for path in sorted(scope.glob("local_*.json")):
        data = read_json(path)
        if data is not None:
            out.append((path, data))
    return out


def load_template(scope: Path, explicit: Path | None) -> tuple[dict[str, Any], Path]:
    """An entry the app itself wrote, to copy unrecognised fields from."""
    if explicit:
        data = read_json(explicit)
        if data is None:
            raise Abort(f"template is not readable JSON: {explicit}")
        return data, explicit
    found = sorted(scope.glob("local_*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    for path in found:
        data = read_json(path)
        if data is not None:
            return data, path
    raise Abort(
        f"no usable local_*.json in {scope} to use as a template.\n"
        "  Open one Claude Code session in that profile first, or pass --template."
    )


def indexed_cli_map(scope: Path) -> dict[str, dict[str, Any]]:
    """Every CLI session id this profile already accounts for."""
    out: dict[str, dict[str, Any]] = {}
    for path, data in entries(scope):
        claims: list[tuple[str, str]] = []
        direct = data.get("cliSessionId")
        if isinstance(direct, str):
            claims.append((direct, "cliSessionId"))
        priors = data.get("priorCliSessionIds")
        if isinstance(priors, list):
            claims.extend((p, "priorCliSessionIds") for p in priors if isinstance(p, str))
        for cli_id, via in claims:
            if out.get(cli_id, {}).get("via") == "cliSessionId":
                continue
            out[cli_id] = {
                "entry": path,
                "sessionId": data.get("sessionId", path.stem),
                "title": data.get("title") or "(untitled)",
                "via": via,
            }
    return out


def lineage_map(scopes: list[Path]) -> dict[str, dict[str, Any]]:
    """Absorbed CLI session id -> the later session that absorbed it."""
    out: dict[str, dict[str, Any]] = {}
    for scope in scopes:
        for _path, data in entries(scope):
            successor = data.get("cliSessionId")
            priors = data.get("priorCliSessionIds")
            if not isinstance(successor, str) or not isinstance(priors, list):
                continue
            for prior in priors:
                if isinstance(prior, str) and prior != successor:
                    out[prior] = {
                        "successor": successor,
                        "title": data.get("title") or "(untitled)",
                    }
    return out


def retarget_cwd(value: Any, cwd: str, hits: Counter[str] | None = None) -> Any:
    """Point every nested working-directory field at one folder."""
    if isinstance(value, dict):
        out = {}
        for k, v in value.items():
            if k in STRUCTURAL_KEYS and isinstance(v, str):
                out[k] = cwd
                if hits is not None:
                    hits[k] += 1
            else:
                out[k] = retarget_cwd(v, cwd, hits)
        return out
    if isinstance(value, list):
        return [retarget_cwd(v, cwd, hits) for v in value]
    return value


def walk_cwds(value: Any, path: str = "") -> list[tuple[str, str]]:
    """Every working-directory value in an entry, with where it was found."""
    found: list[tuple[str, str]] = []
    if isinstance(value, dict):
        for k, v in value.items():
            here = f"{path}.{k}" if path else k
            if k in STRUCTURAL_KEYS and isinstance(v, str):
                found.append((here, v))
            else:
                found.extend(walk_cwds(v, here))
    elif isinstance(value, list):
        for i, v in enumerate(value):
            found.extend(walk_cwds(v, f"{path}[{i}]"))
    return found


def resolve_permissions() -> tuple[dict[str, str], dict[str, str]]:
    """Prefer the user's own default, fall back to the conservative value."""
    settings = read_json(cli_settings()) or {}
    permissions = settings.get("permissions")
    default_mode = permissions.get("defaultMode") if isinstance(permissions, dict) else None

    if isinstance(default_mode, str) and default_mode:
        values = {"permissionMode": default_mode}
        why = {"permissionMode": "user default (settings.json: permissions.defaultMode)"}
    else:
        values = {"permissionMode": CONSERVATIVE["permissionMode"]}
        why = {"permissionMode": "conservative fallback (no user default found)"}

    values["chromePermissionMode"] = CONSERVATIVE["chromePermissionMode"]
    why["chromePermissionMode"] = "conservative fallback (no global setting exists)"
    return values, why


def build_entry(
    template: dict[str, Any],
    facts: dict[str, Any],
    cli_session_id: str,
    perms: dict[str, str],
) -> tuple[dict[str, Any], Counter[str]]:
    """Generate an index entry for one transcript."""
    entry: dict[str, Any] = {}
    tally: Counter[str] = Counter()
    nested: Counter[str] = Counter()

    def clone(value: Any) -> Any:
        return json.loads(json.dumps(value))

    for key, value in template.items():
        if key in STALE_RUN_STATE:
            tally["DROPPED"] += 1
        elif key in NEUTRAL:
            entry[key] = clone(NEUTRAL[key])
            tally["NEUTRAL"] += 1
        elif key in perms:
            entry[key] = perms[key]
            tally["PERMISSION"] += 1
        elif key in DERIVED:
            tally["DERIVED"] += 1
        else:
            entry[key] = retarget_cwd(clone(value), facts["cwd"], nested)
            tally["APP_TRUTH"] += 1

    for key, value in NEUTRAL.items():
        if key not in entry:
            entry[key] = clone(value)
            tally["NEUTRAL"] += 1
    for key, text in perms.items():
        if key not in entry:
            entry[key] = text
            tally["PERMISSION"] += 1

    entry["sessionId"] = f"local_{uuid.uuid4()}"
    entry["cliSessionId"] = cli_session_id
    for key in (
        "cwd",
        "originCwd",
        "createdAt",
        "lastActivityAt",
        "lastFocusedAt",
        "title",
        "completedTurns",
    ):
        entry[key] = facts[key]
    for key in ("model", "effort"):
        entry[key] = facts[key] if facts[key] is not None else template.get(key)
    entry.setdefault("titleSource", template.get("titleSource", "auto"))

    if nested:
        tally["RETARGETED"] += sum(nested.values())
    return entry, tally
