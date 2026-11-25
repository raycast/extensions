#!/usr/bin/env bash
# Rebuilds assets/symbols.json from the latest Open Symbols release.
# Needs git, npm and python3. Usage: scripts/update-data.sh [tag]
set -euo pipefail
cd "$(dirname "$0")/.."
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

tag="${1:-$(git ls-remote --tags --refs --sort=-v:refname https://github.com/OrchardKit/open-symbols.git | head -1 | sed 's#.*refs/tags/##')}"
echo "Open Symbols ${tag}"
# Blobless, no-checkout clone: we only need the file listing (a full checkout is ~1 GB).
git clone --quiet --depth 1 --branch "$tag" --filter=blob:none --no-checkout \
  https://github.com/OrchardKit/open-symbols.git "$work/open-symbols"

mkdir -p "$work/npm"
for p in lucide-static @tabler/icons @phosphor-icons/core @mdi/svg @fortawesome/fontawesome-free ionicons feather-icons; do
  (cd "$work/npm" && tgz="$(npm pack "$p" --silent)" && mkdir "${tgz%.tgz}" && tar xzf "$tgz" -C "${tgz%.tgz}")
done

python3 scripts/build-index.py "$work/open-symbols" "$work/npm"
