#!/bin/sh

set -eu

SCRIPT_DIRECTORY=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
EXTENSION_ROOT=$(dirname -- "$SCRIPT_DIRECTORY")
SOURCE_ROOT="${FXCLAUDE_SOURCE:-$EXTENSION_ROOT/../../../Projects/fxClaude/fxclaude}"

if [ "$#" -gt 1 ]; then
	printf '%s\n' "Usage: npm run update-cli -- [universal-executable]" >&2
	exit 64
fi

if [ "$#" -eq 1 ]; then
	EXECUTABLE="$1"
else
	make -C "$SOURCE_ROOT" universal
	EXECUTABLE="$SOURCE_ROOT/dist/fxclaude-universal-apple-darwin"
fi

xcrun lipo "$EXECUTABLE" -verify_arch arm64
xcrun lipo "$EXECUTABLE" -verify_arch x86_64
"$EXECUTABLE" --help | grep -q "Manage isolated Claude desktop workspaces."
"$EXECUTABLE" integrations attributes --help >/dev/null

DESTINATION="$EXTENSION_ROOT/assets/bin"
mkdir -p "$DESTINATION"
TEMPORARY=$(mktemp "$DESTINATION/.fxclaude.XXXXXX")
trap 'rm -f "$TEMPORARY"' EXIT HUP INT TERM
cp "$EXECUTABLE" "$TEMPORARY"
chmod 755 "$TEMPORARY"
codesign --force --sign - "$TEMPORARY"
codesign --verify --strict "$TEMPORARY"
mv "$TEMPORARY" "$DESTINATION/fxclaude"
(
	cd "$DESTINATION"
	shasum -a 256 fxclaude > fxclaude.sha256
)
printf 'Bundled fxclaude %s (%s)\n' "$("$DESTINATION/fxclaude" --version)" "$(xcrun lipo -archs "$DESTINATION/fxclaude")"
