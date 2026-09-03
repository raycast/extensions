#!/bin/zsh
set -euo pipefail

root_dir="${0:A:h:h}"
stage="$root_dir/scripts/stage-store-release-artifact.sh"
fixture_dir="$(/usr/bin/mktemp -d "${TMPDIR:-/tmp}/mouse-scroll-release-signing.XXXXXX")"
unsetopt BG_NICE
cleanup() { /bin/rm -rf -- "$fixture_dir"; }
trap cleanup EXIT HUP INT TERM

fail() { print -u2 "release-signing integration test failed: $1"; exit 1; }
assert_no_temp() {
  [[ -z "$(/usr/bin/find "$fixture_dir" -maxdepth 1 -name 'helper.release.*' -print)" ]] || fail "temporary helper remains"
}
make_helper() {
  print -rn -- "original" > "$fixture_dir/helper"
  /bin/chmod 755 "$fixture_dir/helper"
}
assert_original() {
  [[ "$(/bin/cat "$fixture_dir/helper")" == "original" ]] || fail "original helper bytes changed"
  [[ "$(/usr/bin/stat -f '%Lp' "$fixture_dir/helper")" == "755" ]] || fail "original helper mode changed"
}

cat > "$fixture_dir/signer-fail" <<'EOF'
#!/bin/zsh
exit 9
EOF
cat > "$fixture_dir/signer-mutate" <<'EOF'
#!/bin/zsh
print -rn -- "signed" > "$1"
EOF
cat > "$fixture_dir/signer-slow" <<'EOF'
#!/bin/zsh
print -rn -- "signed" > "$1"
touch "$READY_FILE"
sleep 1
EOF
cat > "$fixture_dir/verifier-fail" <<'EOF'
#!/bin/zsh
exit 8
EOF
cat > "$fixture_dir/verifier-pass" <<'EOF'
#!/bin/zsh
[[ "$(cat "$1")" == "signed" ]]
EOF
/bin/chmod 755 "$fixture_dir"/signer-* "$fixture_dir"/verifier-*

make_helper
if "$stage" "$fixture_dir/helper" "$fixture_dir/signer-fail" "$fixture_dir/verifier-pass"; then
  fail "signer failure unexpectedly succeeded"
fi
assert_original
assert_no_temp

make_helper
if "$stage" "$fixture_dir/helper" "$fixture_dir/signer-mutate" "$fixture_dir/verifier-fail"; then
  fail "verifier failure unexpectedly succeeded"
fi
assert_original
assert_no_temp

make_helper
"$stage" "$fixture_dir/helper" "$fixture_dir/signer-mutate" "$fixture_dir/verifier-pass"
[[ "$(/bin/cat "$fixture_dir/helper")" == "signed" ]] || fail "successful signing did not replace helper"
[[ "$(/usr/bin/stat -f '%Lp' "$fixture_dir/helper")" == "755" ]] || fail "successful signing changed executable mode"
assert_no_temp

make_helper
ready="$fixture_dir/ready"
READY_FILE="$ready" "$stage" "$fixture_dir/helper" "$fixture_dir/signer-slow" "$fixture_dir/verifier-pass" &
stage_pid=$!
for _ in {1..20}; do
  [[ -f "$ready" ]] && break
  sleep 0.05
done
[[ -f "$ready" ]] || fail "slow signer did not become ready"
kill -TERM "$stage_pid"
set +e
wait "$stage_pid"
signal_result=$?
set -e
[[ "$signal_result" -ne 0 ]] || fail "signal interruption unexpectedly succeeded"
assert_original
assert_no_temp

print -r -- "release-signing staging integration: pass"
