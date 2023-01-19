#!/usr/bin/env python3

# @raycast.schemaVersion 1
# @raycast.title Switch to Lowercase
# @raycast.packageName Text Actions
# @raycast.mode pipe

import sys

sys.stdout.write(sys.stdin.read().lower())
