#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ $(uname -s) != Darwin || $(uname -m) != arm64 ]]; then
  echo "This release targets Apple Silicon macOS." >&2
  exit 1
fi
bash scripts/build-llama.sh
swift build -c release --product digup -j 2 \
  -Xswiftc -file-prefix-map -Xswiftc "$PWD=/usr/src/lens" \
  -Xswiftc -debug-prefix-map -Xswiftc "$PWD=/usr/src/lens"
BINARY_DIR=$(swift build -c release --show-bin-path)
mkdir -p ../assets
cp "$BINARY_DIR/digup" ../assets/digup
strip -S -x ../assets/digup
codesign --force --sign - ../assets/digup
python3 - <<'PY'
from pathlib import Path
import hashlib,json,subprocess
root=Path.cwd()
binary=root.parent/'assets/digup'
data=binary.read_bytes()
for prefix in (b'/Users/',b'/home/'):
    assert prefix not in data, 'Release executable contains a private build path'
sources={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest()
         for p in sorted(root.rglob('*')) if p.is_file()
         and not any(v in p.relative_to(root).parts for v in ('Vendor','.build','.swiftpm','.DS_Store'))}
receipt={'architecture':'arm64','minimumMacOS':'14.0','signature':'ad-hoc',
         'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),
         'upstream':'https://github.com/ARahim3/DigUp',
         'upstreamCommit':'f9b8106ffb8308b4f48b76149d270f7c2e6b4918',
         'llamaCommit':subprocess.check_output(['git','-C','Vendor/llama.cpp','rev-parse','HEAD'],text=True).strip(),
         'swift':subprocess.check_output(['swift','--version'],text=True).strip(),
         'sdk':subprocess.check_output(['xcrun','--show-sdk-version'],text=True).strip(),
         'cmake':subprocess.check_output(['cmake','--version'],text=True).splitlines()[0],
         'sourceSHA256':sources}
(root.parent/'ENGINE-BUILD.json').write_text(json.dumps(receipt,indent=2)+'\n')
print('Release path scan passed; build provenance written.')
PY
