#!/usr/bin/env python3

# @raycast.title Switch to Uppercase
# @raycast.packageName Change Case
# @raycast.description Change text to uppercase
# @raycast.argument1 {"type": "text", "placeholder": "text", "percentEncoded": false}

import sys

sys.stdout.write(sys.argv[1].upper())
