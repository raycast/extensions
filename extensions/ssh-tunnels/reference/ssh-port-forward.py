#!/usr/bin/env python3

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Start Port Forward
# @raycast.mode silent

# Optional parameters:
# @raycast.icon ↔️
# @raycast.packageName SSH

# Documentation:
# @raycast.description Forward ports to a remote host.
# @raycast.author Luis Bañuelos
# @raycast.authorURL https://github.com/luisbc92
# @raycast.argument1 {"type": "text", "placeholder": "Port/s"}
# @raycast.argument2 {"type": "text", "placeholder": "Host"}

from sshports import cliOpen
import sys

_, ports, host = sys.argv
exit(cliOpen(ports, host))