#!/bin/sh

PWD=`osascript -e 'display dialog "Enter login password:" default answer "" with hidden answer with icon file "System:Library:Frameworks:SecurityInterface.framework:Versions:A:Resources:Lock_Locked State@2x.png" with title "brew"' | cut -d: -f3`

BUNDLE_IDENTIFIER=$HOMEBREW_BROWSER
if [ ! -z $BUNDLE_IDENTIFIER ] ; then
    open -b $BUNDLE_IDENTIFIER
fi

echo $PWD
