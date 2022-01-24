#!/usr/bin/env python3

# @raycast.title Prettify JSON
# @raycast.mode silent
# @raycast.packageName JSON
# @raycast.argument1 {"type": "text", "placeholder": "query", "percentEncoded": false}

import json
import sys

try:
    content = json.loads(sys.argv[1])
    sys.stdout.write(json.dumps(content, indent=2))
except json.JSONDecodeError:
    print("Invalid JSON", file=sys.stderr)
    sys.exit(1)
