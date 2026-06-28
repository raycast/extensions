#!/usr/bin/env bash
# change_icon.sh – set or reset a custom icon on a macOS app
#
# This script uses the AppKit NSWorkspace API via Python's PyObjC bridge to
# attach a custom icon to an app bundle or folder.
#
# Usage examples:
#   # Set a custom icon from an .icns or .png file
#   ./change_icon.sh -a "/Applications/MyApp.app" -i ~/Pictures/custom.icns
#   # Reset the app icon back to its default
#   ./change_icon.sh --reset -a "/Applications/MyApp.app"
#

set -euo pipefail

show_help() {
  cat <<'USAGE'
Usage:
  change_icon.sh -a <path> [-i <icon-file>] [-R]
  change_icon.sh --reset -a <path> [-R]

Options:
  -a, --app <path>     Path to the app bundle, folder or file whose icon
                        will be customised.
  -i, --icon <file>    Path to a .png or .icns file to use as the new icon.
                        Required when not resetting.  Any size is accepted;
                        NSWorkspace will create a 512×512 icon automatically.
  -r, --reset          Remove any custom icon and restore the default icon.
  -R, --restart        Restart the app after changing its icon (if running).
  -h, --help           Show this help message.

Examples:
  # Set a custom icon from a PNG on an app bundle
  change_icon.sh -a "/Applications/Firefox.app" -i ~/Downloads/myicon.png

  # Set icon and restart the app to see changes immediately
  change_icon.sh -a "/Applications/Firefox.app" -i ~/Downloads/myicon.png --restart

  # Reset an app's icon
  change_icon.sh --reset -a "/Applications/Firefox.app"
USAGE
}

# Parse arguments
APP=""
ICON=""
RESET=false
RESTART_APP=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    -a|--app)
      if [[ -n ${2-} ]]; then
        APP="$2"
        shift 2
      else
        echo "Error: --app requires an argument." >&2
        exit 1
      fi
      ;;
    -i|--icon)
      if [[ -n ${2-} ]]; then
        ICON="$2"
        shift 2
      else
        echo "Error: --icon requires an argument." >&2
        exit 1
      fi
      ;;
    -r|--reset)
      RESET=true
      shift
      ;;
    -R|--restart)
      RESTART_APP=true
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      show_help
      exit 1
      ;;
  esac
done

# Validate arguments
if [[ -z "$APP" ]]; then
  echo "Error: --app <path> is required." >&2
  show_help
  exit 1
fi

# Remove native macOS Tahoe folder symbol if present
# This attribute (com.apple.icon.folder#S) conflicts with custom icons
remove_native_folder_symbol() {
  local target="$1"
  if xattr -l "$target" 2>/dev/null | grep -q 'com.apple.icon.folder#S'; then
    xattr -d 'com.apple.icon.folder#S' "$target" 2>/dev/null || true
  fi
}

# Restart the app if requested and it's an .app bundle
restart_app_if_needed() {
  if $RESTART_APP && [[ "$APP" == *.app ]]; then
    local app_name
    app_name=$(basename "$APP" .app)
    
    # Check if the app is running using AppleScript
    local is_running
    is_running=$(osascript -e "tell application \"System Events\" to (name of processes) contains \"$app_name\"" 2>/dev/null || echo "false")
    
    if [[ "$is_running" == "true" ]]; then
      echo "Restarting '$app_name'..."
      osascript -e "tell application \"$app_name\" to quit" 2>/dev/null || true
      sleep 2
      open "$APP"
      echo "App '$app_name' restarted"
    else
      echo "App '$app_name' is not running, skipping restart"
    fi
  fi
}

# Convert target and icon paths to absolute paths to avoid issues when
# AppleScript tries to load relative image paths.
if [[ -n "$APP" ]]; then
  if [[ -e "$APP" ]]; then
    APP_DIR=$(cd "$(dirname "$APP")" && pwd)
    APP="${APP_DIR}/$(basename "$APP")"
  fi
fi
# first try to use Python with PyObjC (AppKit). If it fails we
# fall back to AppleScript via osascript using ASObjC.
PYTHON_BIN="python3"

# Function to test whether an interpreter can import AppKit
_python_has_appkit() {
  "$1" - <<'PY' >/dev/null 2>&1
import sys
try:
    import AppKit  # noqa: F401
except Exception:
    sys.exit(1)
sys.exit(0)
PY
}

python_supported=false
if _python_has_appkit "$PYTHON_BIN"; then
  python_supported=true
else
  if [[ -x "/usr/bin/python3" ]] && _python_has_appkit "/usr/bin/python3"; then
    PYTHON_BIN="/usr/bin/python3"
    python_supported=true
  fi
fi

# Determine if osascript is available for AppleScript fallback
osascript_supported=false
if command -v osascript >/dev/null 2>&1; then
  osascript_supported=true
fi

# Use Python if available otherwise use osascript.
# If none of them are available print an error and exit.
if ! $python_supported && ! $osascript_supported; then
  cat >&2 <<'EOM'
Error: No supported method to set icons found.
This script requires either:
  • Python with the PyObjC framework (AppKit) available, or
  • osascript with ASObjC (AppleScript) support.

On macOS, the system Python (/usr/bin/python3) usually includes PyObjC. If
you are using a custom Python, install PyObjC via:

    pip3 install pyobjc

Alternatively, ensure that 'osascript' is available to run AppleScript.
EOM
  exit 1
fi

if [[ ! -e "$APP" ]]; then
  echo "Error: target '$APP' does not exist." >&2
  exit 1
fi

if $RESET; then
  # Reset the custom icon passing None/missing value
  if $python_supported; then
    "$PYTHON_BIN" - "$APP" <<'PY'
import sys
from AppKit import NSWorkspace

target = sys.argv[1]
success = NSWorkspace.sharedWorkspace().setIcon_forFile_options_(None, target, 0)
sys.exit(0 if success else 1)
PY
    result=$?
  else
    # Use AppleScript ASObjC to remove the icon. We use 'missing value' for
    # the image parameter to NSWorkspace.setIcon:forFile:options:.
    osascript -l AppleScript - "$APP" <<'EOS' >/dev/null
use framework "Foundation"
use framework "AppKit"
on run argv
    set destPath to POSIX path of (item 1 of argv)
    set ws to current application's NSWorkspace's sharedWorkspace()
    ws's setIcon:(missing value) forFile:destPath options:0
end run
EOS
    result=$?
  fi
  if [[ $result -eq 0 ]]; then
    echo "Custom icon removed from '$APP'"
    restart_app_if_needed
  else
    echo "Failed to remove custom icon from '$APP'" >&2
    exit 1
  fi
  exit 0
fi

if [[ -z "$ICON" ]]; then
  echo "Error: --icon <file> is required when setting an icon." >&2
  show_help
  exit 1
fi

if [[ ! -f "$ICON" ]]; then
  echo "Error: icon file '$ICON' not found." >&2
  exit 1
fi

# Resolve the icon to an absolute path as well
ICON_DIR=$(cd "$(dirname "$ICON")" && pwd)
ICON="${ICON_DIR}/$(basename "$ICON")"

# Remove native macOS Tahoe folder symbol if present before applying custom icon
remove_native_folder_symbol "$APP"

if $python_supported; then
  # Use PyObjC to load the image and set it as the icon via NSWorkspace.
  "$PYTHON_BIN" - "$ICON" "$APP" <<'PY'
import sys
from AppKit import NSWorkspace, NSImage

icon_path = sys.argv[1]
target = sys.argv[2]

image = NSImage.alloc().initWithContentsOfFile_(icon_path)
if image is None or not image.isValid():
    print(f"Failed to load image '{icon_path}'", file=sys.stderr)
    sys.exit(1)

workspace = NSWorkspace.sharedWorkspace()
success = workspace.setIcon_forFile_options_(image, target, 0)
sys.exit(0 if success else 1)
PY
  result=$?
else
  # Fallback to AppleScript ASObjC. Loads the image and calls
  # NSWorkspace's setIcon:forFile:options: using AppleScript's ASObjC bridge.
  osascript -l AppleScript - "$ICON" "$APP" <<'EOS' >/dev/null
use framework "Foundation"
use framework "AppKit"
on run argv
    set iconPath to POSIX path of (item 1 of argv)
    set destPath to POSIX path of (item 2 of argv)
    set imageData to (current application's NSImage's alloc()'s initWithContentsOfFile:iconPath)
    if imageData is missing value then
        error "Unable to load image" number 1
    end if
    set ws to current application's NSWorkspace's sharedWorkspace()
    ws's setIcon:imageData forFile:destPath options:0
end run
EOS
  result=$?
fi

if [[ $result -eq 0 ]]; then
  echo "Custom icon applied to '$APP'"
  restart_app_if_needed
else
  echo "Failed to set custom icon on '$APP'" >&2
  exit 1
fi