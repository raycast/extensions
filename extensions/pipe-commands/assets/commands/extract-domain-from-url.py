#!/usr/bin/env python3

# @raycast.title Extract Domain from URL
# @raycast.selection {"type": "text"}

from urllib.parse import urlparse
import sys

url = sys.argv[1]
domain = urlparse(url).netloc

print(domain, end="")
