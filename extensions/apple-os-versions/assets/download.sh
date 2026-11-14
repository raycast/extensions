#!/bin/sh
# Downloads a file in the background so it survives Raycast closing the command.
#
# usage: download.sh <url> <destination> <size-or-empty> <sha256-or-empty> <status-file> <title>
#
# The status file holds one line that the extension reads for progress:
#   downloading <pid> | done | failed <reason>

set -u

url=$1
dest=$2
size=$3
sha256=$4
status=$5
title=$6

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
# so the status line is what counts.
is_apple_pkg() {
  pkgutil --check-signature "$1" 2>>"$log" | grep -qx '[[:space:]]*Status: signed Apple Software'
}

# The log starts with the download's title so it's clear which download it belongs to.
printf '%s\n' "$title" >"$log"
echo "downloading $$" >"$status"
mkdir -p "$(dirname "$dest")" || fail "Couldn't create the download folder"

is_apple_url "$url" || fail "Refusing to download from a non-Apple address"

# The extension doesn't start a download whose file already exists. If one appears anyway, it is
# kept but still has to pass the signature check below.
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

echo "done" >"$status"
release_lock
