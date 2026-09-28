# DriveWay

Discover, save, and mount SMB and WebDAV network drives from Raycast, without opening Finder.

## For Everyone

**Getting started**

1. Open **Add Drive** and enter a host and share path. Alias, username, and protocol are optional.
2. Or open **Discover Devices** to see drives already visible on your network, and save the ones you want.
3. Use **Manage Drives** to connect, disconnect, edit, or remove any saved drive.

**Preferences**

- **Network Discovery**: three independent switches control how drives are found. Bonjour/mDNS is on by default and finds drives that announce themselves. Subnet scan and "show all devices" are off by default, since both actively probe your network and take longer.
- **Domain / IP**: optionally always include one specific host, useful if you connect to the same server every time and would rather not add it manually.

**Background commands**

- **Auto-Reconnect** silently reconnects any saved drive you have opted into, on an interval you choose.
- **DriveWay Menu Bar** shows your saved drives and their connection status without opening Raycast, with one-click mount and unmount.

No password is ever stored by this extension. Credentials are handled by the macOS Keychain, the same way Finder's "Connect to Server" handles them.

## Technical Details

- **Protocols**: SMB, WebDAV (https), and WebDAV without TLS. The insecure option is meant for a trusted local network only, since it sends credentials and traffic unencrypted.
- **Mounting**: both SMB and WebDAV mount through AppleScript's `mount volume`, the same mechanism Finder itself uses. This needs no special Automation permission, and can prompt once to trust a self-signed certificate on WebDAV.
- **Discovery**: Bonjour/mDNS browsing (`dns-sd`), an active local subnet scan (an SMB port probe plus an RFC 4918 `OPTIONS` capability check for WebDAV), and a plain ICMP ping sweep for devices that don't advertise SMB or WebDAV at all.
- **Share enumeration**: only SMB supports listing a host's shares live (`smbutil -v view`). WebDAV hosts are added with a manually entered path.
- **AFP**: not offered. Apple removed AFP client support starting with macOS 27, with no available fallback.
