#!/bin/zsh
set -euo pipefail

root_dir="${0:A:h:h}"
helper="${1:-$root_dir/assets/bin/mouse-scroll-helper}"
expected_identifier="com.brandon.mouse-scroll-per-device.helper"

fail() {
  print -u2 "Store release signing blocked: $1"
  exit 1
}

[[ -f "$helper" ]] || fail "expected helper is missing."
architectures="$(/usr/bin/lipo -archs "$helper")"
[[ "$architectures" == *"arm64"* && "$architectures" == *"x86_64"* ]] || fail "helper must be universal arm64+x86_64."

/usr/bin/codesign --verify --strict --verbose=2 "$helper" || fail "strict code-sign verification failed."
inspection="$(/usr/bin/codesign -dv --verbose=4 "$helper" 2>&1)"
requirement="$(/usr/bin/codesign -dr - "$helper" 2>&1)"

authority="$(print -r -- "$inspection" | /usr/bin/grep -E '^Authority=Developer ID Application:.+$' | /usr/bin/head -n 1 || true)"
team="$(print -r -- "$inspection" | /usr/bin/sed -nE 's/^TeamIdentifier=(.+)$/\1/p' | /usr/bin/head -n 1)"
identifier="$(print -r -- "$inspection" | /usr/bin/sed -nE 's/^Identifier=(.+)$/\1/p' | /usr/bin/head -n 1)"
timestamp="$(print -r -- "$inspection" | /usr/bin/sed -nE 's/^Timestamp=(.+)$/\1/p' | /usr/bin/head -n 1)"

[[ -n "$authority" ]] || fail "Developer ID Application authority is required; Apple Development is local-only."
[[ -n "$team" && "$team" != "not set" ]] || fail "a nonempty TeamIdentifier is required."
[[ "$identifier" == "$expected_identifier" ]] || fail "helper Identifier must exactly equal $expected_identifier."
print -r -- "$inspection" | /usr/bin/grep -Eq '^Runtime Version=.+$' || fail "hardened runtime is required."
[[ -n "$timestamp" && "${timestamp:l}" != "none" ]] || fail "a secure signing timestamp is required."

[[ "$requirement" == *"identifier \"$expected_identifier\""* ]] || fail "designated requirement lacks the exact identifier."
[[ "$requirement" == *"anchor apple generic"* ]] || fail "designated requirement lacks the Apple generic anchor."
[[ "$requirement" == *"subject.OU] = \"$team\""* ]] || fail "designated requirement lacks the TeamIdentifier OU binding."

if [[ -n "${MOUSE_SCROLL_PER_DEVICE_RELEASE_TEAM:-}" && "$team" != "$MOUSE_SCROLL_PER_DEVICE_RELEASE_TEAM" ]]; then
  fail "TeamIdentifier does not match MOUSE_SCROLL_PER_DEVICE_RELEASE_TEAM."
fi

print -r -- "Store release signing policy verified: $identifier ($team), $architectures."
