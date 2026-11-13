#!/bin/sh
# Builds a bootable macOS installer ISO from InstallAssistant.pkg, the same way Mist does.
# Runs as root: installing the package and running createinstallmedia both need it.
#
# usage: make-iso.sh <InstallAssistant.pkg> <output.iso> <owner-uid>

set -eu

pkg=$1
iso=$2
owner=$3

work=$(mktemp -d /private/tmp/pomme-iso.XXXXXX)
id=$(basename "$work")
app_mount="/Volumes/$id-app"
media_mount="/Volumes/$id-media"
app_dev=""
media_dev=""

cleanup() {
  [ -n "$media_dev" ] && hdiutil detach -quiet -force "$media_dev" || true
  [ -n "$app_dev" ] && hdiutil detach -quiet -force "$app_dev" || true
  rm -rf "$work"
}
trap cleanup EXIT

# 1. Install the package into a scratch volume to get "Install macOS ….app" without touching /Applications.
hdiutil create -quiet -size 40g -type SPARSE -fs JHFS+ -volname "$id-app" "$work/app.sparseimage"
app_dev=$(hdiutil attach -nobrowse -noverify -noautoopen -mountpoint "$app_mount" "$work/app.sparseimage" | awk 'NR==1 {print $1}')
installer -pkg "$pkg" -target "$app_mount"
app=$(find "$app_mount/Applications" -maxdepth 1 -name 'Install macOS*.app' -print | head -n 1)
if [ -z "$app" ]; then
  echo "The package didn't contain a macOS installer app" >&2
  exit 1
fi

# 2. Write the bootable installer to a disk image sized for the app plus headroom.
app_mb=$(du -sm "$app" | awk '{print $1}')
hdiutil create -quiet -size "$((app_mb + 2048))m" -fs JHFS+ -volname "$id-media" "$work/media.dmg"
media_dev=$(hdiutil attach -nobrowse -noverify -noautoopen -mountpoint "$media_mount" "$work/media.dmg" | awk 'NR==1 {print $1}')
"$app/Contents/Resources/createinstallmedia" --volume "$media_mount" --nointeraction

# createinstallmedia renames and remounts the volume, so detach by device.
hdiutil detach -quiet "$media_dev"
media_dev=""
hdiutil detach -quiet "$app_dev"
app_dev=""
rm -f "$work/app.sparseimage"

# 3. Convert to a CD/DVD master (.cdr), which is an ISO image.
hdiutil convert -quiet "$work/media.dmg" -format UDTO -o "$work/media.cdr"
mv "$work/media.cdr" "$iso"
chown "$owner" "$iso"
