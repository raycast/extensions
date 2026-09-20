"""Isolated Claude Desktop profiles, and Claude Code history moved between them."""

from __future__ import annotations

__version__ = "0.0.1"


class Abort(Exception):
    """A condition the user has to fix. The CLI prints it and exits 1."""
