#!/bin/bash

set -euo pipefail

readonly repository="CaptureContext/fxcodex"
readonly release_asset="fxcodex-universal-apple-darwin"
script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly script_directory
project_directory="$(cd "$script_directory/.." && pwd)"
readonly project_directory
readonly asset_directory="$project_directory/assets/bin"

if [[ $# -ne 1 || ! "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
	echo "Usage: npm run update-cli -- x.y.z" >&2
	exit 64
fi

readonly release_version="$1"
readonly release_url="https://github.com/$repository/releases/download/$release_version"
temporary_directory="$(mktemp -d)"
readonly temporary_directory
readonly downloaded_executable="$temporary_directory/$release_asset"

trap 'rm -rf "$temporary_directory"' EXIT

echo "Downloading fxcodex $release_version..."
curl --fail --location --retry 3 --silent --show-error \
	--output "$downloaded_executable" \
	"$release_url/$release_asset"
curl --fail --location --retry 3 --silent --show-error \
	--output "$downloaded_executable.sha256" \
	"$release_url/$release_asset.sha256"

(
	cd "$temporary_directory"
	shasum -a 256 --check "$release_asset.sha256"
)

chmod +x "$downloaded_executable"
xcrun lipo "$downloaded_executable" -verify_arch arm64
xcrun lipo "$downloaded_executable" -verify_arch x86_64
codesign --verify --strict --verbose=2 "$downloaded_executable"
codesign -vvvv -R="notarized" --check-notarization "$downloaded_executable"

actual_version="$(FXCODEX_JSON=-1 FXCODEX_DISABLE_AUTO_UPDATE=1 "$downloaded_executable" version)"
readonly actual_version
if [[ "$actual_version" != "$release_version" ]]; then
	echo "Expected fxcodex $release_version, downloaded $actual_version" >&2
	exit 1
fi

digest="$(shasum -a 256 "$downloaded_executable" | awk '{print $1}')"
readonly digest

mkdir -p "$asset_directory"
install -m 755 "$downloaded_executable" "$asset_directory/.fxcodex.tmp"
printf '%s  fxcodex\n' "$digest" > "$asset_directory/.fxcodex.sha256.tmp"
mv "$asset_directory/.fxcodex.tmp" "$asset_directory/fxcodex"
mv "$asset_directory/.fxcodex.sha256.tmp" "$asset_directory/fxcodex.sha256"

echo "Updated bundled fxcodex to $release_version ($digest)."
