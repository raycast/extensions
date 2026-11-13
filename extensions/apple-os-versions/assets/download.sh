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
lock="$status.lock"

# The extension claims the lock before starting this script and writes this script's PID into it.
# Only remove the lock while it is still ours: once released, a retry may already have claimed it.
release_lock() {
  [ "$(cat "$lock" 2>/dev/null)" = "$$" ] && rm -f "$lock"
  return 0
}
trap release_lock EXIT
trap 'exit 143' TERM INT HUP
here=$(dirname "$0")

# The final status is written before the lock is released, so a retry never has its fresh status
# overwritten. Progress and results are shown by the extension (its toast and the Downloads view).
fail() {
  echo "failed $1" >"$status"
  release_lock
  exit 1
}

# The extension only accepts Apple URLs, so every redirect must stay on Apple's hosts over https.
is_apple_url() {
  host=$(printf '%s' "$1" | sed -nE 's#^https://([^/?#:@]+)(:443)?([/?#].*)?$#\1#p' | tr '[:upper:]' '[:lower:]')
  case "$host" in
    # Keep in sync with APPLE_DOWNLOAD_DOMAINS in src/sofa.ts.
    apple.com | *.apple.com | cdn-apple.com | *.cdn-apple.com) return 0 ;;
    *) return 1 ;;
  esac
}

# Installer packages must carry Apple's signature. pkgutil exits 0 even when a package is unsigned,
# so the status line is what counts. The root step repeats this check on its own copy.
is_apple_pkg() {
  pkgutil --check-signature "$1" 2>>"$log" | grep -qx '[[:space:]]*Status: signed Apple Software'
}

# The log starts with the download's title so it's clear which download it belongs to.
printf '%s\n' "$title" >"$log"
echo "downloading $$" >"$status"
mkdir -p "$(dirname "$dest")" || fail "Couldn't create the download folder"

is_apple_url "$url" || fail "Refusing to download from a non-Apple address"

# A finished file is only here when an earlier ISO build failed. It is checked again below, and
# the root step verifies its own copy, so reusing it can't smuggle in an unverified package.
if [ ! -f "$dest" ]; then
  # A partial file that is already complete makes curl's resume fail, so only resume when something is missing.
  current=$(stat -f %z "$part" 2>/dev/null || echo 0)
  if [ -z "$size" ] || [ "$current" != "$size" ]; then
    # --globoff: URLs are used literally. --proto/--proto-redir: https only, including redirects.
    final=$(curl --fail --location --globoff --proto '=https' --proto-redir '=https' --max-redirs 10 \
      --silent --show-error --retry 3 --continue-at - --output "$part" --write-out '%{url_effective}' "$url" 2>>"$log") ||
      fail "$(tail -n 1 "$log")"
    if ! is_apple_url "$final"; then
      rm -f "$part"
      fail "The download was redirected away from Apple, so it was deleted"
    fi
  fi

  if [ -n "$sha256" ]; then
    actual=$(shasum -a 256 "$part" | awk '{print $1}')
    if [ "$actual" != "$sha256" ]; then
      rm -f "$part"
      fail "Checksum mismatch, the file was deleted"
    fi
  fi

  mv -f "$part" "$dest" || fail "Couldn't move the file into place"
fi

case "$dest" in
  *.pkg)
    if ! is_apple_pkg "$dest"; then
      rm -f "$dest"
      fail "The installer package isn't signed by Apple, so it was deleted"
    fi
    ;;
esac

if [ -n "$iso" ]; then
  echo "building $$" >"$status"
  # Values are passed as arguments and quoted by AppleScript, never interpolated into the script.
  # The root step builds the ISO in directories only it controls and prints where it left it.
  built=$(osascript \
    -e 'on run argv' \
    -e 'do shell script "/bin/sh " & quoted form of item 1 of argv & " " & quoted form of item 2 of argv & " " & quoted form of item 3 of argv with prompt "Pomme Versions needs administrator access to build a bootable macOS installer ISO." with administrator privileges' \
    -e 'end run' \
    "$here/make-iso.sh" "$dest" "$(id -u)" 2>>"$log")
  result=$?
  # On any failure the downloaded package is kept so a retry can go straight to building.
  if [ $result -ne 0 ]; then
    # osascript reports error -128 when the password prompt is cancelled.
    if grep -q -- "-128" "$log"; then
      fail "Cancelled at the password prompt. Retry to build without downloading again"
    fi
    fail "Couldn't build the ISO (see the log for details)"
  fi
  # Only accept exactly /private/tmp/pomme-out.<letters and digits>/installer.iso, checked one
  # component at a time (a case pattern's * would also match "/" and "..").
  out=$(dirname "$built")
  suffix=${out#/private/tmp/pomme-out.}
  case "$suffix" in
    '' | *[!A-Za-z0-9]*) fail "The ISO build returned an unexpected path" ;;
  esac
  if [ "$out" != "/private/tmp/pomme-out.$suffix" ] || [ "$built" != "$out/installer.iso" ]; then
    fail "The ISO build returned an unexpected path"
  fi
  if [ ! -f "$built" ] || [ -L "$built" ] || [ ! -O "$built" ]; then
    fail "The ISO build returned an unexpected file"
  fi
  mkdir -p "$(dirname "$iso")" && mv -f "$built" "$iso" || { rm -rf "$out"; fail "Couldn't move the ISO into place"; }
  rm -rf "$out"
  rm -f "$dest"
fi

echo "done" >"$status"
release_lock
