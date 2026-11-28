#!/bin/bash
set -euo pipefail
umask 077
root=$1
# the shell keeps fd 9 open, so the lock lasts through installation.
exec 9>"$root.lock"
/usr/bin/perl -MFcntl=:flock -e 'open(my $lock, ">&=", 9) or die $!; flock($lock, LOCK_EX) or die $!'
[[ -d "$root" ]] && exit 0
stage=$(mktemp -d "$(dirname "$root")/voice-install-XXXXXX")
trap 'rm -rf "$stage"' EXIT
cd "$stage"
fetch() {
  /usr/bin/curl --fail --location --silent --show-error --retry 2 --connect-timeout 20 --max-time 900 "$1" -o archive
  printf '%s  archive\n' "$2" | /usr/bin/shasum -a 256 --check --status
  /usr/bin/tar -xf archive
  rm archive
}
runtime=sherpa-onnx-v1.12.20-osx-universal2-shared
model=kokoro-int8-multi-lang-v1_0
base=https://github.com/k2-fsa/sherpa-onnx/releases/download
fetch "$base/v1.12.20/$runtime.tar.bz2" ee78b87028e42e461cd828ce4a4fdcaed602b659a811cd104c4219aecf0a0290
fetch "$base/tts-models/$model.tar.bz2" 72c347230107ef8a31098ec4d468a605244beef5f1ed00db97efa13518800653
mkdir -p voice/bin voice/lib
mv "$runtime/bin/sherpa-onnx-offline-tts" voice/bin/
mv "$runtime"/lib/* voice/lib/
mv "$model" voice/model
mv voice "$root"
