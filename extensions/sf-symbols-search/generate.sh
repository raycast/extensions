#!/bin/sh

# Set variables
PLAYGROUND_RESOURCES_PATH=SFSymbolsSearch.playground/Resources
APP_NAME=
RESOURCES_PATH=
CATEGORY_TITLES_PATH=

if [[ $(ls /Applications | grep 'SF Symbols.app') ]]; then
	APP_NAME="SF Symbols"
	RESOURCES_PATH="/Applications/$APP_NAME.app/Contents/Resources"
	CATEGORY_TITLES_PATH="$RESOURCES_PATH/en.lproj/Localizable.strings"
elif [[ $(ls /Applications | grep 'SF Symbols beta.app') ]]; then
	APP_NAME="SF Symbols beta"
	RESOURCES_PATH="/System/Library/CoreServices/CoreGlyphs.bundle/Contents/Resources"
	CATEGORY_TITLES_PATH="/Applications/$APP_NAME.app/Contents/Frameworks/SFSymbolsKit.framework/Versions/Current/Frameworks/SFSymbolsShared.framework/Resources/CategoryTitles.strings"
else
	echo "Aborting: SF Symbols.app is not installed..."
	exit 1
fi

# Generate files containing glyphs and their corresponding names from SF Symbols.app
osascript <<END
	tell application "$APP_NAME" to activate
	tell application "System Events"
		keystroke tab
		keystroke "a" using command down
		keystroke "c" using {shift down, command down} -- Copy all symbol names
		delay 1
	end tell
END
pbpaste > "$PLAYGROUND_RESOURCES_PATH/symbol_names.txt"

osascript <<END
	tell application "$APP_NAME" to activate
	tell application "System Events"
		keystroke "c" using command down -- Copy all glyphs
		delay 1
	end tell
	tell application "SF Symbols beta" to quit
END
pbpaste | fold -w1 | tail -n +2 > "$PLAYGROUND_RESOURCES_PATH/symbol_glyphs.txt"

# Copy category and search term metadata
cp "$CATEGORY_TITLES_PATH" "$PLAYGROUND_RESOURCES_PATH"
find $PLAYGROUND_RESOURCES_PATH -name "*.strings" -exec mv '{}' "$PLAYGROUND_RESOURCES_PATH/CategoryTitles.plist" \;
cp "$RESOURCES_PATH/categories.plist" "$PLAYGROUND_RESOURCES_PATH/"
cp "$RESOURCES_PATH/symbol_categories.plist" "$PLAYGROUND_RESOURCES_PATH/"
cp "$RESOURCES_PATH/symbol_search.plist" "$PLAYGROUND_RESOURCES_PATH/"

# Generate JSON data for extension
if [ "$APP_NAME" = "SF Symbols" ]; then
	swift SFSymbolsSearch.playground/Contents.swift > assets/symbols/data.json
	if [ ! -f assets/symbols/data_beta.json ]; then
		echo "Beta data needed. Please download and install SF Symbols beta.app from https://developer.apple.com/design/resources/ and re-run this script."
		exit 1
	fi
else
	swift SFSymbolsSearch.playground/Contents.swift > assets/symbols/data_beta.json
	if [ ! -f assets/symbols/data.json ]; then
		echo "Stable data needed. Please download and install SF Symbols.app from https://developer.apple.com/design/resources/ and re-run this script."
		exit 1
	fi
fi