#!/usr/bin/env python3

# @raycast.schemaVersion 1
# @raycast.title URL Encode
# @raycast.icon 🔗
# @raycast.packageName Developer Utils
# @raycast.mode pipe

import urllib.parse
import sys

content = sys.stdin.read()
sys.stdout.write(urllib.parse.quote_plus(content))
