#!/usr/bin/env bash
set -euo pipefail
MODE="${1:---verify}"
APP_NAME="MeetingCaptureHelper"
BUNDLE_ID="com.raycast.extensions.meeting-capture.helper"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAGED_APP="$ROOT_DIR/assets/$APP_NAME.app"
BUILD_DIR="$(mktemp -d /tmp/meeting-capture-build.XXXXXX)"
trap '/bin/rm -rf "$BUILD_DIR"' EXIT
BUILD_APP="$BUILD_DIR/$APP_NAME.app"
APP_CONTENTS="$BUILD_APP/Contents"
APP_BINARY="$APP_CONTENTS/MacOS/$APP_NAME"
APP_RESOURCES="$APP_CONTENTS/Resources"
LAME_BINARY="$ROOT_DIR/vendor/lame"

pkill -x "$APP_NAME" >/dev/null 2>&1 || true
swift build --scratch-path "$BUILD_DIR" --arch arm64 --arch x86_64
BUILD_BINARY="$(swift build --scratch-path "$BUILD_DIR" --arch arm64 --arch x86_64 --show-bin-path)/$APP_NAME"
mkdir -p "$APP_CONTENTS/MacOS"
if [[ ! -x "$LAME_BINARY" ]]; then "$ROOT_DIR/script/build_lame.sh"; fi
cp "$BUILD_BINARY" "$APP_BINARY"
mkdir -p "$APP_RESOURCES"
cp "$LAME_BINARY" "$APP_RESOURCES/lame"
chmod +x "$APP_BINARY"
chmod +x "$APP_RESOURCES/lame"
cat >"$APP_CONTENTS/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>$APP_NAME</string>
<key>CFBundleIdentifier</key><string>$BUNDLE_ID</string>
<key>CFBundleName</key><string>$APP_NAME</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>LSMinimumSystemVersion</key><string>27.0</string>
<key>LSUIElement</key><true/>
<key>NSScreenCaptureUsageDescription</key><string>Record meeting system audio after you press the Raycast toggle.</string>
<key>NSMicrophoneUsageDescription</key><string>Record your microphone together with meeting audio.</string>
<key>NSSpeechRecognitionUsageDescription</key><string>Create a private on-device text transcript after you stop recording.</string>
</dict></plist>
PLIST
/usr/bin/xattr -cr "$BUILD_APP"
/usr/bin/codesign --force --sign - "$APP_RESOURCES/lame"
/usr/bin/codesign --force --sign - --identifier "$BUNDLE_ID" "$BUILD_APP"
/usr/bin/codesign --verify --strict --verbose=2 "$BUILD_APP"
rm -rf "$STAGED_APP"
COPYFILE_DISABLE=1 /usr/bin/ditto --noextattr --noqtn "$BUILD_APP" "$STAGED_APP"
/usr/bin/xattr -cr "$STAGED_APP"
/usr/bin/codesign --verify --strict --verbose=2 "$STAGED_APP"

case "$MODE" in
  --verify|verify) test -x "$STAGED_APP/Contents/MacOS/$APP_NAME" ;;
  --debug|debug) lldb -- "$APP_BINARY" ;;
  --logs|logs) /usr/bin/log stream --info --style compact --predicate "process == '$APP_NAME'" ;;
  --telemetry|telemetry) /usr/bin/log stream --info --style compact --predicate "subsystem == '$BUNDLE_ID'" ;;
  run) echo "Use the Raycast toggle to start or stop recording." ;;
  *) echo "usage: $0 [run|--debug|--logs|--telemetry|--verify]" >&2; exit 2 ;;
esac
