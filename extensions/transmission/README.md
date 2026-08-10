# Transmission

Control Transmission from Raycast.

## Supported clients

Both Transmission and Transmission Daemon are supported.

## Setup

### Transmission Desktop

To control Transmission (the desktop app) you need to enable _remote access_
from its preferences. Once enabled, you can connect to it specifying `localhost` as host, and `9091` as port.

We suggest to also set authentication for additional security.

### Transmission Daemon

To control Transmission Daemon (`transmission-daemon`) just insert the configuration parameters
on the extension configuration page as you would do with any other remote client.
