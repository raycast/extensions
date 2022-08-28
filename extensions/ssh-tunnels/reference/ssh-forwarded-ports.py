#!/usr/bin/env python3

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Forwarded Ports
# @raycast.mode inline
# @raycast.refreshTime 10s

# Optional parameters:
# @raycast.icon ↔️
# @raycast.packageName SSH

# Documentation:
# @raycast.description Shows active local port forwards.
# @raycast.author Luis Bañuelos
# @raycast.authorURL https://github.com/luisbc92

from sshports import cliStatus

cliStatus()
exit(0)