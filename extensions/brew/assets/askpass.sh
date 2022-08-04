#!/bin/sh

osascript -e 'display dialog "Enter login password:" default answer "" with hidden answer with icon file "System:Library:Frameworks:SecurityInterface.framework:Versions:A:Resources:Lock_Locked State@2x.png" with title "brew"' | cut -d: -f3

