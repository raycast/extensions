#!/usr/bin/env python3

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Stop Port Forward
# @raycast.mode fullOutput

# Optional parameters:
# @raycast.icon ↔️
# @raycast.packageName SSH

# Documentation:
# @raycast.description Forward ports to a remote host.
# @raycast.author Luis Bañuelos
# @raycast.authorURL https://github.com/luisbc92
# @raycast.argument1 {"type": "text", "placeholder": "Index", "optional": true}

from sshports import cliConnections, cliClose
import sys

if len(sys.argv) == 2:
    if sys.argv[1] != "":
        exit(cliClose(sys.argv[1]))

cliConnections()
exit(0)