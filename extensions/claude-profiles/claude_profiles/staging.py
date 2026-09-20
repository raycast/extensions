"""Staging directories and the manifests that make a run reversible.

``claude-profiles undo <run>`` reads the manifest back.
"""

from __future__ import annotations

import datetime as dt
import hashlib
import json
from pathlib import Path
from typing import Any

from . import Abort
from .paths import state_dir

MANIFEST_NAME = "manifest.json"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def new_run(kind: str, explicit: Path | None = None) -> Path:
    """A fresh staging directory. ``kind`` is ``import`` or ``optimize``."""
    if explicit:
        run = explicit.expanduser().resolve()
    else:
        stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
        run = state_dir() / "runs" / f"{kind}-{stamp}"
    run.mkdir(parents=True, exist_ok=True)
    return run


def runs() -> list[Path]:
    """Every run directory holding a manifest, newest first."""
    root = state_dir() / "runs"
    if not root.is_dir():
        return []
    found = [p for p in root.iterdir() if (p / MANIFEST_NAME).is_file()]
    return sorted(found, key=lambda p: p.name, reverse=True)


def write_manifest(
    run: Path,
    kind: str,
    profile: Path,
    records: list[dict[str, Any]],
    **extra: Any,
) -> None:
    payload: dict[str, Any] = {
        "kind": kind,
        "createdAt": dt.datetime.now().isoformat(timespec="seconds"),
        "profile": str(profile),
        "staging": str(run),
        "records": records,
    }
    payload.update(extra)
    (run / MANIFEST_NAME).write_text(json.dumps(payload, indent=2))


def read_manifest(run: Path) -> dict[str, Any]:
    path = run / MANIFEST_NAME
    if not path.is_file():
        raise Abort(f"no {MANIFEST_NAME} in {run}")
    try:
        data = json.loads(path.read_text())
    except ValueError as exc:
        raise Abort(f"{path} is not readable JSON: {exc}") from exc
    if not isinstance(data, dict) or not isinstance(data.get("records"), list):
        raise Abort(f"{path} is not a run manifest")
    return data


def save_manifest(run: Path, data: dict[str, Any]) -> None:
    (run / MANIFEST_NAME).write_text(json.dumps(data, indent=2))
