#!/bin/sh

RESOURCE_DIR=SFSymbolsSearch.playground/Resources
APP_NAME="SF Symbols"

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
pbpaste > "$RESOURCE_DIR/symbol_names.txt"

osascript <<END
	tell application "$APP_NAME" to activate
	tell application "System Events"
		keystroke "c" using command down -- Copy all glyphs
		delay 1
	end tell
	tell application "SF Symbols beta" to quit
END
pbpaste | fold -w1 | tail -n +2 > "$RESOURCE_DIR/symbol_glyphs.txt"

# Copy search term metadata from CoreGlyphs.bundle and SF Symbols app
cp "/Applications/$APP_NAME.app/Contents/Resources/en.lproj/Localizable.strings" "$RESOURCE_DIR"
mv "$RESOURCE_DIR/Localizable.strings" "$RESOURCE_DIR/Localizable.plist"
cp "/System/Library/CoreServices/CoreGlyphs.bundle/Contents/Resources/categories.plist" "$RESOURCE_DIR/"
cp "/System/Library/CoreServices/CoreGlyphs.bundle/Contents/Resources/symbol_categories.plist" "$RESOURCE_DIR/"
cp "/System/Library/CoreServices/CoreGlyphs.bundle/Contents/Resources/symbol_search.plist" "$RESOURCE_DIR/"