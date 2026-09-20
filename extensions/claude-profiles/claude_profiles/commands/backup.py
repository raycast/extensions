"""snapshot the state in a profile that cannot be regenerated.

runtime, browser cache, cookies and other credential stores are excluded;
sign in again rather than restoring auth from a backup.
"""

from __future__ import annotations

import argparse
import datetime as dt
import shutil
import socket
from pathlib import Path

from .. import Abort
from ..paths import default_profile, profile_roots, resolve_profile

ITEMS = (
    "claude-code-sessions",
    "local-agent-mode-sessions",
    "git-shadow",
    "git-worktrees.json",
    "scratch-workspaces",
    "config.json",
    "claude_desktop_config.json",
)

PRUNE = ("local-agent-mode-sessions/skills-plugin",)


def run_backup(args: argparse.Namespace) -> int:
    if args.all and args.profiles:
        raise Abort("--all takes no profile arguments")
    if args.all:
        profiles = profile_roots()
    elif args.profiles:
        profiles = [resolve_profile(p) for p in args.profiles]
    else:
        profiles = [default_profile()]
    if not profiles:
        raise Abort("no profiles found to back up")

    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    out = (args.out or Path.home() / f"claude-profile-backup-{stamp}").expanduser()
    out.mkdir(parents=True, exist_ok=True)

    manifest = [
        "Claude Desktop profile backup",
        f"created: {dt.datetime.now():%Y-%m-%d %H:%M:%S}",
        f"host:    {socket.gethostname()}",
        "",
    ]
    print(f"Backing up to:\n  {out}\n")

    for profile in profiles:
        if not profile.is_dir():
            print(f"  skip {profile} (not a directory)")
            continue
        profile = profile.resolve()
        label = "default" if profile == default_profile().resolve() else profile.name
        dest = out / label
        dest.mkdir(parents=True, exist_ok=True)

        copied = 0
        for item in ITEMS:
            source = profile / item
            if not source.exists():
                continue
            if source.is_dir():
                shutil.copytree(source, dest / item, dirs_exist_ok=True)
            else:
                shutil.copy2(source, dest / item)
            copied += 1
        for item in PRUNE:
            shutil.rmtree(dest / item, ignore_errors=True)

        sessions = sorted(dest.rglob("local_*.json"))
        size = sum(f.stat().st_size for f in dest.rglob("*") if f.is_file())
        print(f"  {label:<14} {size // 1024:>6} KB  {copied} items, {len(sessions)} sessions")
        manifest += [
            f"profile: {label}",
            f"  source:   {profile}",
            f"  size:     {size // 1024} KB",
            f"  sessions: {len(sessions)}",
            *(f"    {f.relative_to(dest)}" for f in sessions),
            "",
        ]

    manifest += [
        "Restore one profile's session index with:",
        "  cp -R <backup>/<label>/claude-code-sessions <profile-dir>/",
        "",
        "Excluded: runtime, browser caches, built-in skills, and every",
        "credential store. Sign in again rather than restoring auth.",
    ]
    (out / "MANIFEST.txt").write_text("\n".join(manifest) + "\n")
    print(f"\nManifest: {out / 'MANIFEST.txt'}")
    return 0
