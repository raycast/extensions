#!/usr/bin/env python3

# @raycast.title Switch to Lowercase
# @raycast.mode silent
# @raycast.packageName Change Case
# @raycast.description Change text to lowercase
# @raycast.selection {"type": "text"}

import sys

sys.stdout.write(sys.argv[1].lower())
