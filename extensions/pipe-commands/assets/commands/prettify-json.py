#!/usr/bin/env python3

# @raycast.title Prettify JSON
# @raycast.input {"type": "text"}

import json
import sys

try:
    selection = json.loads(sys.stdin.read())
    content = json.loads(selection)
    sys.stdout.write(json.dumps(content, indent=2))
except json.JSONDecodeError:
    print("Invalid JSON", file=sys.stderr)
    sys.exit(1)
