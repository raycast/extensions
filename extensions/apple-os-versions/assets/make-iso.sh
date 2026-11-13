#!/bin/sh
# Builds a bootable macOS installer ISO from InstallAssistant.pkg, the same way Mist does.
# Runs as root: installing the package and running createinstallmedia both need it.
#
# usage: make-iso.sh <InstallAssistant.pkg> <owner-uid>
#
# On success, prints the path of the finished ISO: a file owned by <owner-uid> inside a
# directory that root created and then handed to that user. The caller moves it into place.
#
# Root never trusts anything the user can still write:
# - The package is copied into a root-only directory, and that copy must carry Apple's
#   installer signature before it is installed.
# - The installer app lands on a volume mounted with ownership enforced, and it must be
#   signed by Apple before root runs createinstallmedia from it.
# - Root only writes inside directories it created, and it never follows a path the
#   user chose. The output directory is handed to the user as the last step.

set -eu

pkg_src=$1
owner=$2

case "$owner" in
  '' | *[!0-9]*)
    echo "Invalid owner: $owner" >&2
    exit 1
    ;;
esac

# Tool output goes to stderr so stdout carries only the final path back through osascript.
exec 3>&1 1>&2

umask 077
work=$(mktemp -d /private/tmp/pomme-iso.XXXXXX)
out=$(mktemp -d /private/tmp/pomme-out.XXXXXX)
id=$(basename "$work")
app_mount="/Volumes/$id-app"
media_mount="/Volumes/$id-media"
app_dev=""
media_dev=""
handed_over=""

cleanup() {
  [ -n "$media_dev" ] && hdiutil detach -quiet -force "$media_dev" || true
  [ -n "$app_dev" ] && hdiutil detach -quiet -force "$app_dev" || true
  rm -rf "$work"
  [ -n "$handed_over" ] || rm -rf "$out"
}
trap cleanup EXIT

# 1. Copy the package somewhere only root can write, then check the copy. The check and the
#    install both use this copy, so the user's file can't be swapped in between.
pkg="$work/InstallAssistant.pkg"
# A clone (APFS copy-on-write) costs no extra space and is unaffected by later changes to the source.
cp -c "$pkg_src" "$pkg" 2>/dev/null || cp "$pkg_src" "$pkg"
# pkgutil exits 0 even for unsigned packages, so the status line is what matters.
if ! pkgutil --check-signature "$pkg" | grep -qx '[[:space:]]*Status: signed Apple Software'; then
  echo "The installer package isn't signed by Apple" >&2
  exit 1
fi

# 2. Install it into a scratch volume to get "Install macOS ….app" without touching /Applications.
#    Ownership is enforced so the user can't modify the installed app on the volume.
hdiutil create -quiet -size 40g -type SPARSE -fs JHFS+ -volname "$id-app" "$work/app.sparseimage"
# Attach and parse separately: in a pipeline, a failed attach would be hidden by awk's exit status.
attached=$(hdiutil attach -owners on -nobrowse -noverify -noautoopen -mountpoint "$app_mount" "$work/app.sparseimage")
app_dev=$(printf '%s\n' "$attached" | awk 'NR==1 {print $1}')
installer -pkg "$pkg" -target "$app_mount"
rm -f "$pkg"
app=$(find "$app_mount/Applications" -maxdepth 1 -name 'Install macOS*.app' -print | head -n 1)
if [ -z "$app" ]; then
  echo "The package didn't contain a macOS installer app" >&2
  exit 1
fi
tool="$app/Contents/Resources/createinstallmedia"
if ! codesign --verify --strict -R='anchor apple' "$app" || ! codesign --verify --strict -R='anchor apple' "$tool"; then
  echo "The installer app isn't signed by Apple" >&2
  exit 1
fi

# 3. Write the bootable installer to a disk image sized for the app plus headroom.
app_mb=$(du -sm "$app" | awk '{print $1}')
hdiutil create -quiet -size "$((app_mb + 2048))m" -fs JHFS+ -volname "$id-media" "$work/media.dmg"
attached=$(hdiutil attach -owners on -nobrowse -noverify -noautoopen -mountpoint "$media_mount" "$work/media.dmg")
media_dev=$(printf '%s\n' "$attached" | awk 'NR==1 {print $1}')
"$tool" --volume "$media_mount" --nointeraction

# createinstallmedia renames and remounts the volume, so detach by device.
hdiutil detach -quiet "$media_dev"
media_dev=""
hdiutil detach -quiet "$app_dev"
app_dev=""
rm -f "$work/app.sparseimage"

# 4. Convert to a CD/DVD master (.cdr), which is an ISO image, inside root's own directories.
hdiutil convert -quiet "$work/media.dmg" -format UDTO -o "$out/installer.cdr"
mv "$out/installer.cdr" "$out/installer.iso"

# 5. Hand the result over. Both paths were created by root and the user has never had access
#    to them, so -h is belt and braces: nothing here can be a link the user planted.
chown -h "$owner" "$out/installer.iso"
chown -h "$owner" "$out"
handed_over=1
printf '%s\n' "$out/installer.iso" >&3
