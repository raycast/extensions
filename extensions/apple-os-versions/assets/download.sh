#!/bin/sh
# Downloads a file in the background so it survives Raycast closing the command.
# Optionally builds a bootable installer ISO from a downloaded InstallAssistant.pkg.
#
# usage: download.sh <url> <destination> <size-or-empty> <sha256-or-empty> <status-file> <title> [iso-destination]
#
# The status file holds one line that the extension reads for progress:
#   downloading <pid> | building <pid> | done | failed <reason>

set -u

url=$1
dest=$2
size=$3
sha256=$4
status=$5
title=$6
iso=${7:-}

part="$dest.download"
log="$status.log"
here=$(dirname "$0")

notify() {
  osascript -e 'on run argv' -e 'display notification (item 2 of argv) with title (item 1 of argv)' -e 'end run' \
    "$1" "$2" >/dev/null 2>&1 || true
}

fail() {
  echo "failed $1" >"$status"
  notify "Download Failed" "$title: $1"
  exit 1
}

: >"$log"
echo "downloading $$" >"$status"
mkdir -p "$(dirname "$dest")" || fail "Couldn't create the download folder"

# A partial file that is already complete makes curl's resume fail, so only resume when something is missing.
current=$(stat -f %z "$part" 2>/dev/null || echo 0)
if [ -z "$size" ] || [ "$current" != "$size" ]; then
  curl --fail --location --silent --show-error --retry 3 --continue-at - --output "$part" "$url" 2>>"$log" ||
    fail "$(tail -n 1 "$log")"
fi

if [ -n "$sha256" ]; then
  actual=$(shasum -a 256 "$part" | awk '{print $1}')
  if [ "$actual" != "$sha256" ]; then
    rm -f "$part"
    fail "Checksum mismatch, the file was deleted"
  fi
fi

mv -f "$part" "$dest" || fail "Couldn't move the file into place"

if [ -n "$iso" ]; then
  echo "building $$" >"$status"
  notify "Building Installer ISO" "Enter your password to build $(basename "$iso")"
  work=$(mktemp -d "${TMPDIR:-/tmp}/pomme-iso.XXXXXX") || fail "Couldn't create a temporary folder"
  # Values are passed as arguments and quoted by AppleScript, never interpolated into the script.
  osascript \
    -e 'on run argv' \
    -e 'do shell script "/bin/sh " & quoted form of item 1 of argv & " " & quoted form of item 2 of argv & " " & quoted form of item 3 of argv & " " & quoted form of item 4 of argv with prompt "Pomme Versions needs administrator access to build a bootable macOS installer ISO." with administrator privileges' \
    -e 'end run' \
    "$here/make-iso.sh" "$dest" "$work/installer.iso" "$(id -u)" >>"$log" 2>&1
  result=$?
  rm -f "$dest"
  if [ $result -ne 0 ] || [ ! -f "$work/installer.iso" ]; then
    rm -rf "$work"
    fail "Couldn't build the ISO (see the log for details)"
  fi
  mkdir -p "$(dirname "$iso")" && mv -f "$work/installer.iso" "$iso" || { rm -rf "$work"; fail "Couldn't move the ISO into place"; }
  rm -rf "$work"
fi

echo "done" >"$status"
notify "Download Complete" "$title"
