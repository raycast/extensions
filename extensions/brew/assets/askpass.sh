#!/bin/sh

# Tell the extension a password was actually asked for. The dialog takes focus
# from Raycast, so a success toast shown afterwards can land in a window the
# user has left; the caller checks this file to decide how to report success.
if [ -n "$BREW_ASKPASS_MARKER" ]; then touch "$BREW_ASKPASS_MARKER"; fi

PWD=`osascript -e 'display dialog "Enter login password:" default answer "" with hidden answer with icon file "System:Library:Frameworks:SecurityInterface.framework:Versions:A:Resources:Lock_Locked State@2x.png" with title "brew"' | cut -d: -f3`

BUNDLE_IDENTIFIER=$HOMEBREW_BROWSER
if [ ! -z $BUNDLE_IDENTIFIER ] ; then
    open -b $BUNDLE_IDENTIFIER
fi

echo $PWD
