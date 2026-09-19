#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p assets
build_dir=$(mktemp -d "${TMPDIR:-/tmp}/resource-inspector-build.XXXXXX")
trap 'rm -rf "$build_dir"' EXIT HUP INT TERM
app="assets/Resource Inspector Notifications.app"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources"
cat > "$app/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>com.juhas96.resource-inspector.notifications</string>
<key>CFBundleName</key><string>Resource Inspector Notifications</string>
<key>CFBundleDisplayName</key><string>Resource Inspector</string>
<key>CFBundleExecutable</key><string>notifications</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleVersion</key><string>1</string>
<key>LSMinimumSystemVersion</key><string>13.0</string>
<key>LSUIElement</key><true/>
<key>NSPrincipalClass</key><string>NSApplication</string>
</dict></plist>
PLIST
for architecture in arm64 x86_64; do
  echo 'runInspector()' > "$build_dir/main.swift"
  /usr/bin/swiftc -O -target "${architecture}-apple-macosx13.0" \
    -module-cache-path "${TMPDIR:-/tmp}/resource-inspector-swift-cache-${architecture}" \
    "$build_dir/main.swift" native/Inspector.swift native/Inactivity.swift -o "$build_dir/inspector-${architecture}"
  cp native/Notifications.swift "$build_dir/main.swift"
  /usr/bin/swiftc -O -DINSPECTOR_TESTING -target "${architecture}-apple-macosx13.0" \
    -module-cache-path "${TMPDIR:-/tmp}/resource-inspector-swift-cache-${architecture}" \
    native/Inspector.swift native/Inactivity.swift "$build_dir/main.swift" -o "$build_dir/notifications-${architecture}"
done
/usr/bin/lipo -create "$build_dir/inspector-arm64" "$build_dir/inspector-x86_64" -output assets/inspector
/usr/bin/codesign --force --sign - assets/inspector
/usr/bin/lipo -create "$build_dir/notifications-arm64" "$build_dir/notifications-x86_64" -output "$app/Contents/MacOS/notifications"
/usr/bin/codesign --force --sign - "$app"
