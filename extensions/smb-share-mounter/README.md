# SMB Share Mounter

Mount your saved SMB shares from Raycast, without opening Finder. Each host is checked on port 445 before mounting, and unreachable hosts are reported separately from failed mounts.

## Add SMB Server

Save one SMB share: an IP address or hostname, a share name (or nested path like `share/sub/folder`), and optionally an alias and a username.

**Example:** host `192.168.1.10`, path `shared/photos`, username `jane` → saves a share that mounts as `smb://jane@192.168.1.10/shared/photos`. Add an alias like `Home NAS` to show that instead of the IP address everywhere else in the extension.

## Manage SMB Servers

Browse your saved shares, each tagged **Connected** if it's currently mounted, with actions to **Connect**/**Unmount**, **Edit**, or **Remove** it.

**Example:** open the command, select `Home NAS`, and press **Connect** (or **Unmount**, once it's tagged Connected) to act on just that one share without touching the others.

## Mount SMB Shares

Mount every saved, reachable share in one run. Unreachable hosts and any mount failures are reported in a single summary toast.

**Example:** run the command after waking your Mac back up on your home network to reconnect all your saved shares at once.

## Unmount SMB Shares

Unmount every saved share that's currently connected, in one run.
The command wont have any effect if server is in use, for example an open file or folder. This saves accidental data loss.

**Example:** run the command before putting your laptop to sleep or leaving the network, to cleanly disconnect everything you'd mounted.

## A note on the password prompt

The first time you mount a share (or after macOS forgets it), you'll get a native credential dialog — that's macOS/Finder, not this extension. Set a **Username** on the entry and check **Remember this password in my keychain** when prompted, and it won't ask again.
