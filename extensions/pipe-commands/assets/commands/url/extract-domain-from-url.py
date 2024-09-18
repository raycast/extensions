#!/usr/bin/env python3

# @raycast.schemaVersion 1
# @raycast.title Extract Domain from URL
# @raycast.icon 🔗
# @raycast.packageName Developer Utils
# @raycast.mode pipe
# @raycast.inputType url

from urllib.parse import urlparse
import sys

url = sys.stdin.read()
domain = urlparse(url).netloc

print(domain, end="")
