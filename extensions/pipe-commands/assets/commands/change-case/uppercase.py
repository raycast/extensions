#!/usr/bin/env python3

# @raycast.title Switch to Uppercase
# @raycast.packageName Text Actions
# @raycast.mode replace
# @raycast.argument1 {"type": "text"}

import sys

sys.stdout.write(sys.argv[1].upper())
