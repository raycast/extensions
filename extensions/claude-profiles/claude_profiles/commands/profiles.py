"""create, list, launch and forget isolated profiles.

each profile is an Electron ``--user-data-dir`` with its own login, chats and
settings. the registry is a JSON file the Raycast extension also reads and
writes. on Linux each profile also gets an XDG ``.desktop`` launcher.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import time
from pathlib import Path

from .. import Abort
from ..paths import (
    Profile,
    desktop_entries_dir,
    is_macos,
    load_registry,
    profile_is_running,
    profiles_root,
    save_registry,
    unique_slug,
)

LINUX_BIN = "claude-desktop"

PALETTE = ("#3584e4", "#e01b24", "#33d17a", "#f5c211", "#9141ac", "#ed5b00")

BADGE = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
    '<rect width="64" height="64" rx="14" fill="{color}"/>'
    '<text x="32" y="44" font-family="sans-serif" font-size="36" font-weight="600"'
    ' text-anchor="middle" fill="#fff">{letter}</text></svg>'
)

DESKTOP_ENTRY = """[Desktop Entry]
Type=Application
Name=Claude ({name})
Comment=Isolated Claude Desktop profile: {name}
Exec={binary} "--user-data-dir={data_dir}"
Icon={icon}
Terminal=false
Categories=Network;
StartupWMClass=Claude
"""


def desktop_entry_path(slug: str) -> Path:
    return desktop_entries_dir() / f"claude-profile-{slug}.desktop"


def badge_path(slug: str) -> Path:
    return profiles_root() / "icons" / f"{slug}.svg"


def write_launcher(profile: Profile, index: int) -> Path:
    """XDG launcher plus a colored badge, one per profile."""
    icon = badge_path(profile.id)
    icon.parent.mkdir(parents=True, exist_ok=True)
    letter = next((c for c in profile.name if c.isalnum()), "?").upper()
    icon.write_text(BADGE.format(color=PALETTE[index % len(PALETTE)], letter=letter))

    path = desktop_entry_path(profile.id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        DESKTOP_ENTRY.format(
            name=profile.name, binary=LINUX_BIN, data_dir=profile.dataDir, icon=icon
        )
    )
    path.chmod(0o755)
    if database := shutil.which("update-desktop-database"):
        subprocess.run([database, str(path.parent)], capture_output=True, check=False)
    return path


def launch(data_dir: Path) -> None:
    """start a new instance; ``-n`` forces a new process even if one is already running."""
    if is_macos():
        subprocess.run(
            ["open", "-n", "-a", "Claude", "--args", f"--user-data-dir={data_dir}"], check=True
        )
        return
    if not shutil.which(LINUX_BIN):
        raise Abort(
            f"{LINUX_BIN} is not on PATH. Install Claude Desktop for Linux first:\n"
            "  https://code.claude.com/docs/en/desktop-linux"
        )
    subprocess.Popen(
        [LINUX_BIN, f"--user-data-dir={data_dir}"],
        start_new_session=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def run_add(args: argparse.Namespace) -> int:
    name = args.name.strip()
    if not name:
        raise Abort("profile name can't be empty")

    existing = load_registry()
    slug = unique_slug(name, existing)
    data_dir = args.data_dir.expanduser().resolve() if args.data_dir else profiles_root() / slug
    data_dir.mkdir(parents=True, exist_ok=True)

    profile = Profile(id=slug, name=name, dataDir=str(data_dir), createdAt=int(time.time() * 1000))
    save_registry([*existing, profile])

    print(f'Created "{name}" ({slug})')
    print(f"  data dir : {data_dir}")
    if not is_macos():
        print(f"  launcher : {write_launcher(profile, len(existing))}")
        print(f'\nFind "Claude ({name})" in your app grid and pin it.')

    if args.open:
        launch(data_dir)
        print("\nOpening. Sign in; that is what creates the account directory")
        print("every session migration writes into.")
    return 0


def run_list(_args: argparse.Namespace) -> int:
    profiles = load_registry()
    if not profiles:
        print('No profiles yet. Create one with: claude-profiles profile add "Work"')
        return 0
    print(f"{'':2}{'ID':<16} {'NAME':<20} DATA DIR")
    running = False
    for profile in profiles:
        live = profile_is_running(profile.path)
        running |= live
        missing = "" if profile.path.is_dir() else "  [missing]"
        mark = "*" if live else ""
        print(f"{mark:2}{profile.id:<16} {profile.name:<20} {profile.dataDir}{missing}")
    if running:
        print("\n* running")
    return 0


def _find(profile_id: str) -> Profile:
    for profile in load_registry():
        if profile_id in (profile.id, profile.name):
            return profile
    raise Abort(f"no profile '{profile_id}' (see: claude-profiles profile list)")


def run_open(args: argparse.Namespace) -> int:
    profile = _find(args.id)
    launch(profile.path)
    print(f"Opened {profile.name}")
    return 0


def run_remove(args: argparse.Namespace) -> int:
    profile = _find(args.id)
    save_registry([p for p in load_registry() if p.id != profile.id])
    desktop_entry_path(profile.id).unlink(missing_ok=True)
    badge_path(profile.id).unlink(missing_ok=True)
    print(f"Removed {profile.name} from the list.")

    if args.purge:
        shutil.rmtree(profile.path, ignore_errors=True)
        print(f"Deleted its data at {profile.dataDir}.")
    else:
        print(f"Its login and chats stay at {profile.dataDir}.")
        print("Re-add with:")
        print(f'  claude-profiles profile add "{profile.name}" --data-dir "{profile.dataDir}"')
    return 0
