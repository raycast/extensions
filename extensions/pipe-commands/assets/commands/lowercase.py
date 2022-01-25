#!/usr/bin/env python3

# @raycast.title Switch to Lowercase
# @raycast.packageName Change Case
# @raycast.selection {"type": "text"}

import sys

sys.stdout.write(sys.argv[1].lower())
