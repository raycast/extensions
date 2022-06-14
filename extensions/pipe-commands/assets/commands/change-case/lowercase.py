#!/usr/bin/env python3

# @raycast.schemaVersion 1
# @raycast.title Switch to Lowercase
# @raycast.packageName Text Actions
# @raycast.mode pipe
# @raycast.argument1 {"type": "text", "placeholder": "Text"}

import sys

sys.stdout.write(sys.argv[1].lower())
