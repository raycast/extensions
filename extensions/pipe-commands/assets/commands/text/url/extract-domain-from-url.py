#!/usr/bin/env python3

# @raycast.title Extract Domain from URL
# @raycast.icon Link
# @raycast.packageName Developer Utils
# @raycast.input {"type": "text"}

from urllib.parse import urlparse
import sys

url = sys.stdin.read().strip()
domain = urlparse(url).netloc

print(domain, end="")
