#!/usr/bin/env python3

# @raycast.schemaVersion 1
# @raycast.title URL Decode
# @raycast.icon 🔗
# @raycast.packageName Developer Utils
# @raycast.mode pipe
# @raycast.inputType text

import urllib.parse
import sys

content = sys.stdin.read()
sys.stdout.write(urllib.parse.unquote_plus(content))
