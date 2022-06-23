#!/usr/bin/env python3

# @raycast.title Extract Domain from URL
# @raycast.icon Link
# @raycast.packageName Developer Utils
# @raycast.mode copy
# @raycast.argument1 {"type": "text"}

from urllib.parse import urlparse
import sys

url = sys.argv[1].strip()
domain = urlparse(url).netloc

print(domain, end="")
