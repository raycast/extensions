#!/bin/zsh
set -euo pipefail

if (( $# < 3 )); then
  print -u2 "usage: $0 <helper> <absolute-signer> <absolute-verifier> [signer arguments...]"
  exit 64
fi

helper="$1"
signer="$2"
verifier="$3"
shift 3

[[ -f "$helper" ]] || { print -u2 "Store release signing blocked: expected helper is missing."; exit 1; }
[[ "$signer" = /* && "$verifier" = /* ]] || {
  print -u2 "Store release signing blocked: signer and verifier must be absolute project paths."
  exit 64
}

temp_helper="$(/usr/bin/mktemp "${helper}.release.XXXXXX")"
cleanup() {
  /bin/rm -f -- "$temp_helper"
}
on_signal() {
  cleanup
  exit 143
}
trap cleanup EXIT
trap on_signal HUP INT TERM

# Keep the canonical helper unchanged until both explicitly supplied operations
# complete successfully on a sibling copy. A same-directory mv is atomic.
/bin/cp -p "$helper" "$temp_helper"
"$signer" "$temp_helper" "$@"
"$verifier" "$temp_helper"
/bin/mv -f "$temp_helper" "$helper"
