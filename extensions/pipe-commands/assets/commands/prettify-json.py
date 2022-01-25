#!/usr/bin/env python3

# @raycast.title Prettify JSON
# @raycast.selection {"type": "text"}

import json
import sys

try:
    content = json.loads(sys.argv[1])
    sys.stdout.write(json.dumps(content, indent=2))
except json.JSONDecodeError:
    print("Invalid JSON", file=sys.stderr)
    sys.exit(1)
