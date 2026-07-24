#!/usr/bin/env python3

# @raycast.schemaVersion 1
# @raycast.title Format as String Literal
# @raycast.packageName Text Actions
# @raycast.mode pipe
# @raycast.inputType text
# @raycast.icon 🔤

import sys

input_str = sys.stdin.read()
sys.stdout.write(repr(input_str))
