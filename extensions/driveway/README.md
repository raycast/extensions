# DriveWay

Discover, save, and mount SMB and WebDAV network drives from Raycast, without opening Finder.

If you only ever connect to one server, [Network Drive](https://www.raycast.com/SuoweiHu/network-drive) covers that case with a single host set in preferences. DriveWay is for finding drives on your network and keeping a list of several, each with its own alias, username, and protocol.

## For Everyone

**Getting started**

1. Open **Add Drive** and enter a host and share path. Alias, username, and protocol are optional.
2. Or open **Discover Devices** to see drives already visible on your network, and save the ones you want.
3. Use **Manage Drives** to connect, disconnect, edit, or remove any saved drive. It opens straight to your saved drives; run **Discover on Network** (⌘⇧D) from its action menu to list what else is reachable, below them. Network drives that are mounted without being saved, from **Browse Shares on This Host** or from Finder, are listed under **Mounted but Not Saved**, where you can unmount them or save them.

**Preferences**

- **Network Discovery**: three independent switches control which sources are used. Bonjour/mDNS is on by default and finds drives and computers that announce themselves. Subnet scan and "show all devices" are off by default, since both actively probe every address on your network and take longer. Discover Devices runs them as soon as it opens; Manage Drives only when you ask it to, so opening it is never held up by a scan.
- **Domain / IP**: optionally always include one specific host, useful if you connect to the same server every time and would rather not add it manually. The username and password set here are used for this host only, never for anything found on the network.

**Background commands**

- **Auto-Reconnect** silently reconnects any saved drive you have opted into, on an interval you choose.
- **DriveWay Menu Bar** shows your saved drives and their connection status without opening Raycast, with one-click mount and unmount. Network drives that are mounted without being saved, from **Browse Shares on This Host** or from Finder, appear under **Mounted but Not Saved** and can be unmounted from there. The number next to the icon counts connected saved drives. A preference on that command counts the unsaved ones too, which is off by default so the number doesn't move for mounts the extension isn't keeping.

The extension keeps no password store of its own. The optional Domain/IP password lives in Raycast's secure preference storage, and everything else is left to the macOS Keychain, the same way Finder's "Connect to Server" does it.

## Technical Details

- **Protocols**: SMB, WebDAV (https), and WebDAV without TLS. The insecure option is meant for a trusted local network only, since it sends credentials and traffic unencrypted over the network.
- **Mounting**: both SMB and WebDAV mount through AppleScript's `mount volume`, the same mechanism Finder itself uses. This needs no special Automation permission, and can prompt once to trust a self-signed certificate on WebDAV.
- **Discovery**: Bonjour/mDNS browsing (`dns-sd`) for shares and, via `_device-info._tcp`, for computers that announce themselves without advertising one; an active local subnet scan (an SMB port probe plus an RFC 4918 `OPTIONS` capability check for WebDAV); and a plain ICMP ping sweep for devices that advertise nothing at all.
- **Share enumeration**: only SMB supports listing a host's shares live (`smbutil -v view`). WebDAV hosts are added with a manually entered path. A discovered host is enumerated only if the server authenticates without a password, so a saved credential is never sent to a machine you didn't name; anything else is listed at host level and you sign in to browse it, leaving the password empty where the server lists its shares without one. Where a password is needed, `smbutil` is answered over a pty rather than given it on the command line, where any local process could read it.
- **AFP**: not offered. Apple removed AFP client support starting with macOS 27, with no available fallback.
