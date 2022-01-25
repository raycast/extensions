#!/usr/bin/env python3

# @raycast.title Copy Domain from URL
# @raycast.selection {"type": "url"}

from urllib.parse import urlparse
import sys
import subprocess

url = sys.argv[1]
domain = urlparse(url).netloc
subprocess.run(["pbcopy"], input=domain, text=True)
