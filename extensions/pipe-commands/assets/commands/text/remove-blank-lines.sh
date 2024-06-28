#!/bin/bash

# @raycast.schemaVersion 1
# @raycast.title Remove Blank Lines
# @raycast.packageName Text Actions
# @raycast.mode pipe
# @raycast.inputType text
# @raycast.icon 🔤

sed '/^[[:blank:]]*$/d'

