#!/usr/bin/env python3

# @raycast.title Switch to Uppercase
# @raycast.packageName Text Actions
# @raycast.input {"type": "text"}

import sys

selection = sys.stdin.read()
sys.stdout.write(selection.upper())
