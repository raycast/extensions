#!/bin/bash

# @raycast.schemaVersion 1
# @raycast.title Remove Smart Quotes
# @raycast.packageName Text Actions
# @raycast.mode pipe
# @raycast.inputType text
# @raycast.icon 🔤

# originally pulled from: https://www.jvt.me/posts/2022/04/28/cli-remove-smartquotes/
sed -E "s/‘|’/'/g;s/“|”/\"/g"