#!/usr/bin/env python3
"""Generate Raycast Store media for Jumper by driving Raycast on this Mac.

  python3 scripts/media/store_media.py screenshots   -> metadata/jumper-1.png ... (2000x1250)
  python3 scripts/media/store_media.py gif           -> media/demo.gif

Needs: `npm run dev` running, Accessibility + Screen Recording permission for the calling app,
ffmpeg (gif only). Takes over the screen while running: hands off keyboard and mouse.
See .claude/skills/store-screenshots and .claude/skills/demo-gif for the full procedure.
"""

import atexit
import json
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
DEEPLINK = "raycast://extensions/matt_herwig/jumper/"
TMP = Path(tempfile.mkdtemp(prefix="jumper-media-"))
atexit.register(shutil.rmtree, TMP, ignore_errors=True)

# Built-in apps with no personal content, activated oldest -> newest so they fill every visible
# History row (about 10 on a 1352x878pt screen) and push the user's own apps out of view.
# The last one is "Current".
# `framed` apps get their window moved over the recording area for the GIF.
DEMO_APPS = [
    ("Tips", ["open", "-a", "Tips"], False),
    ("Stocks", ["open", "-a", "Stocks"], False),
    ("Clock", ["open", "-a", "Clock"], False),
    ("Calculator", ["open", "-a", "Calculator"], False),
    ("Dictionary", ["open", "dict://jump"], False),
    ("Font Book", ["open", "-a", "Font Book"], False),
    ("Chess", ["open", "-a", "Chess"], False),
    ("Finder", None, True),  # opens a window on /System/Applications (Apple apps only), see setup_apps
    ("Preview", ["open", "-a", "Preview", str(ROOT / "assets/extension-icon.png")], True),
    ("Ghostty", None, True),  # the owner's own session: used only if already running, never quit
    ("TextEdit", None, True),  # opens a scratch note, see setup_apps
]

# Apps whose process name differs from the app name.
PROCESS = {"Ghostty": "ghostty"}

# Keys shown in the GIF overlay: the owner's own bindings (Raycast Settings → Extensions → Jumper).
# Commands are actually triggered by deeplink, since Raycast ignores synthetic hotkeys.
HOTKEYS = {
    "back": ["⇧", "⌘", "["],
    "forward": ["⇧", "⌘", "]"],
    "toggle": ["⌘", "⌘"],  # double-tap ⌘
    "history": ["⇧", "⌘"],
}

NOTE = "Launch checklist\n\n- Screenshots\n- Demo GIF\n- Submit to the Raycast Store\n"


def osa(script: str) -> str:
    return subprocess.run(["osascript", "-e", script], capture_output=True, text=True, check=True).stdout.strip()


def keys(expr: str) -> None:
    """System Events keystroke, e.g. 'keystroke "k" using command down' or 'key code 53'."""
    osa(f'tell application "System Events" to {expr}')


def escape(times: int = 1) -> None:
    for _ in range(times):
        keys("key code 53")
        time.sleep(0.35)


def close_raycast() -> None:
    """Escape until Raycast's window is gone. Never sends Escape to another app (it could be this terminal)."""
    for _ in range(6):
        if raycast_window() is None:
            return
        escape()
    raise RuntimeError("Raycast window did not close")


def deeplink(command: str) -> None:
    subprocess.run(["open", "-g", DEEPLINK + command], check=True)


def running(app: str) -> bool:
    return subprocess.run(["pgrep", "-xq", PROCESS.get(app, app)]).returncode == 0


def frontmost() -> str:
    return osa('tell application "System Events" to get name of first process whose frontmost is true')


def raycast_window() -> tuple[int, int, int, int, int] | None:
    """(id, x, y, w, h) of Raycast's launcher window while it is on screen, else None."""
    out = subprocess.run(["swift", str(HERE / "raycast-window.swift")], capture_output=True, text=True)
    if out.returncode != 0:
        return None
    wid, x, y, w, h = map(int, out.stdout.split())
    return wid, x, y, w, h


def wait_for_window(process: str, timeout: float = 10) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            if int(osa(f'tell application "System Events" to count windows of process "{process}"')) > 0:
                return
        except subprocess.CalledProcessError:
            pass
        time.sleep(0.3)
    raise RuntimeError(f"{process} opened no window")


class DemoApps:
    """Brings up DEMO_APPS in order and undoes it afterwards (quits only what it launched)."""

    def __init__(self, frame: tuple[int, int, int, int] | None = None):
        self.frame = frame
        self.launched: list[str] = []
        self.finder_window: str | None = None
        self.note = TMP / "Jumper.txt"
        self.previous_app = frontmost()
        self.restore: list[tuple[str, str]] = []  # (process, "x, y, w, h") of windows we moved but don't own

    def __enter__(self):
        self.note.write_text(NOTE)
        for name, cmd, framed in DEMO_APPS:
            process = PROCESS.get(name, name)
            if name == "Ghostty":
                if not running(name):
                    print("note: Ghostty not running, leaving it out of the demo", file=sys.stderr)
                    continue
                osa('tell application "Ghostty" to activate')
            else:
                if not running(name):
                    self.launched.append(name)
                if name == "TextEdit":
                    subprocess.run(["open", "-a", "TextEdit", str(self.note)], check=True)
                elif name == "Finder":
                    self.finder_window = osa(
                        'tell application "Finder"\n'
                        '  set w to make new Finder window to (POSIX file "/System/Applications" as alias)\n'
                        "  activate\n"
                        "  return id of w\n"
                        "end tell"
                    )
                else:
                    subprocess.run(cmd, check=True)
            wait_for_window(process)
            time.sleep(0.8)
            if self.frame and framed:
                x, y, w, h = self.frame
                try:
                    if name == "Ghostty":
                        bounds = osa(
                            f'tell application "System Events" to tell process "{process}" to '
                            "get (position of window 1) & (size of window 1)"
                        )
                        self.restore.append((process, bounds))
                    osa(
                        f'tell application "System Events" to tell process "{process}"\n'
                        f"  set position of window 1 to {{{x}, {y}}}\n"
                        f"  set size of window 1 to {{{w}, {h}}}\n"
                        "end tell"
                    )
                except subprocess.CalledProcessError as e:
                    print(f"warning: could not frame {name}: {e.stderr.strip()}", file=sys.stderr)
        time.sleep(0.5)
        return self

    def __exit__(self, *exc):
        for process, bounds in self.restore:
            x, y, w, h = bounds.split(", ")
            osa(
                f'tell application "System Events" to tell process "{process}"\n'
                f"  set position of window 1 to {{{x}, {y}}}\n"  # position first, or the size gets clipped
                f"  set size of window 1 to {{{w}, {h}}}\n"
                "end tell"
            )
        if self.finder_window:
            subprocess.run(["osascript", "-e", f'tell application "Finder" to close (window id {self.finder_window})'])
        subprocess.run(
            ["osascript", "-e", f'tell application "TextEdit" to close (every document whose name is "{self.note.name}") saving no']
        )
        for name in self.launched:
            subprocess.run(["osascript", "-e", f'tell application "{name}" to quit'], capture_output=True)
            if running(name):  # some apps (Stocks) refuse the AppleScript quit
                subprocess.run(["pkill", "-x", name])
        subprocess.run(["osascript", "-e", f'tell application "{self.previous_app}" to activate'])


def capture(path: Path) -> None:
    wid = raycast_window()[0]  # type: ignore[index]
    raw = TMP / "window.png"
    subprocess.run(["screencapture", "-x", "-l", str(wid), str(raw)], check=True)
    subprocess.run(["swift", str(HERE / "compose.swift"), str(raw), str(path)], check=True)
    print(f"wrote {path.relative_to(ROOT)}")


def screenshots() -> None:
    out = ROOT / "metadata"
    out.mkdir(exist_ok=True)
    for old in out.glob("jumper-*.png"):
        old.unlink()
    close_raycast()
    with DemoApps():
        # 1. History list
        deeplink("history")
        time.sleep(2)
        capture(out / "jumper-1.png")

        # 2. Action panel
        keys('keystroke "k" using command down')
        time.sleep(1)
        capture(out / "jumper-2.png")
        escape()

        # 3. Excluded section: exclude Chess, filter to it, show Include in History, then undo.
        keys('keystroke "Chess"')
        time.sleep(0.8)
        keys('keystroke "x" using {control down, shift down}')
        time.sleep(3)  # let the success toast fade
        keys('keystroke "k" using command down')
        time.sleep(1)
        capture(out / "jumper-3.png")
        keys("key code 36")  # Return = Include in History
        time.sleep(1.5)
        close_raycast()

    # 4. Root search for "jumper": every command, Back selected to show its hotkey. Raycast ignores a synthetic
    # ⌘Space, but Escape from a command's view pops to root search. Matching files from the
    # user's disk show below the commands; review them before committing.
    deeplink("history")
    time.sleep(1.5)
    escape()
    time.sleep(0.6)
    if raycast_window() is None:
        raise RuntimeError("root search did not open")
    keys('keystroke "jumper"')
    time.sleep(1.5)
    keys("key code 125")  # select Back: Raycast shows the hotkey of the selected row only
    time.sleep(0.6)
    capture(out / "jumper-4.png")
    close_raycast()


def gif() -> None:
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found: brew install ffmpeg")
    close_raycast()
    # Recording area: Raycast's window plus a margin; every demo window is placed exactly on it,
    # so whatever is behind (the user's own windows) never shows.
    deeplink("history")
    time.sleep(1.5)
    _, rx, ry, rw, rh = raycast_window()  # type: ignore[misc]
    close_raycast()
    frame = (rx - 120, max(ry - 50, 40), rw + 240, rh + 170)
    x, y, w, h = frame
    video = TMP / "demo.mov"
    back, fwd, tog, hist = (HOTKEYS[c] for c in ("back", "forward", "toggle", "history"))
    card = {"card": "Jumper", "sub": "Back and Forward for your Mac apps"}
    # (overlay message, deeplink command or keystroke or None, seconds to hold)
    timeline = [
        (card, None, 2.8),
        ({}, None, 0.4),
        ({"keys": back, "title": "Back", "detail": "to the previous app"}, "back", 1.7),
        ({"keys": back, "title": "Back", "detail": "and again"}, "back", 1.7),
        ({"keys": back, "title": "Back", "detail": "as far as you like"}, "back", 1.9),
        ({"keys": fwd, "title": "Forward", "detail": "retrace your steps"}, "forward", 1.7),
        ({"keys": fwd, "title": "Forward", "detail": "retrace your steps"}, "forward", 1.7),
        ({"keys": fwd, "title": "Forward", "detail": "back where you started"}, "forward", 1.9),
        ({"keys": tog, "title": "Toggle", "detail": "flip between your last two apps"}, "toggle", 1.7),
        ({"keys": tog, "title": "Toggle", "detail": "and back"}, "toggle", 1.9),
        ({"keys": hist, "title": "History", "detail": "every running app, most recent first"}, "history", 2.2),
        ({"keys": ["↓"], "title": "History", "detail": "pick any app"}, "key code 125", 0.5),
        ({"keys": ["↓"], "title": "History", "detail": "pick any app"}, "key code 125", 0.5),
        ({"keys": ["↓"], "title": "History", "detail": "pick any app"}, "key code 125", 0.9),
        ({"keys": ["↩"], "title": "Switch to App", "detail": "jump straight there"}, "key code 36", 1.8),
        ({}, None, 0.4),
        ({"card": "Jumper", "sub": "Free on the Raycast Store"}, None, 2.8),
    ]
    with DemoApps(frame):
        keycast = subprocess.Popen(
            ["swift", str(HERE / "keycast.swift"), *map(str, frame), str(ROOT / "assets/extension-icon.png")], stdin=subprocess.PIPE, text=True
        )

        def overlay(message: dict) -> None:
            keycast.stdin.write(json.dumps(message) + "\n")  # type: ignore[union-attr]
            keycast.stdin.flush()  # type: ignore[union-attr]

        # Park the pointer outside the recording area (screencapture -v records it).
        subprocess.run(["swift", "-e", "import CoreGraphics; CGWarpMouseCursorPosition(CGPoint(x: 2, y: 2000))"])
        overlay(card)
        time.sleep(4)  # keycast compiles on first run; the card is up before recording starts
        duration = sum(hold for *_, hold in timeline) + 1.5
        rec = subprocess.Popen(
            ["screencapture", "-x", "-v", "-V", str(int(duration) + 1), "-R", f"{x},{y},{w},{h}", str(video)]
        )
        time.sleep(1)  # screencapture startup; trimmed off below
        checked: set[str] = set()
        for message, action, hold in timeline:
            overlay(message)
            if action and action.startswith("key code"):
                keys(action)
            elif action:
                deeplink(action)
            time.sleep(hold)
            no_view = action in ("back", "forward", "toggle")
            if no_view and action not in checked and raycast_window() is not None:
                # No-view commands only flash Raycast's window; if it is still up a second later,
                # it's the "Request to run" prompt. The user must pick Always Run Command once.
                time.sleep(1)
                if raycast_window() is not None:
                    rec.kill()
                    keycast.kill()
                    sys.exit(f"Raycast asked before running '{action}': choose Always Run Command, then rerun.")
            if no_view:
                checked.add(action)  # type: ignore[arg-type]
        rec.wait()
        keycast.stdin.close()
        keycast.wait()

        out = ROOT / "media"
        out.mkdir(exist_ok=True)
        subprocess.run(
            [
                "ffmpeg", "-y", "-loglevel", "error", "-ss", "1", "-i", str(video),
                "-vf", "fps=15,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];"
                "[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle",
                str(out / "demo.gif"),
            ],
            check=True,
        )
        print(f"wrote media/demo.gif ({(out / 'demo.gif').stat().st_size // 1024} KB)")


if __name__ == "__main__":
    {"screenshots": screenshots, "gif": gif}.get(sys.argv[1] if len(sys.argv) > 1 else "", lambda: sys.exit(__doc__))()
