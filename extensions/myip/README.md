# MyIP

See your internal and external IPv4 addresses in one view, or keep your IP address in the menu bar.

## Commands

### My IP

Shows your internal and external IPv4 addresses in two lines.

- Press `Enter` to copy the external IP.
- Press `Cmd+Enter` (`Ctrl+Enter` on Windows) to copy the internal IP.
- Press `Cmd+R` (`Ctrl+R` on Windows) to refresh.

Opening the view does not copy anything. Copying only happens through an action.

### IP in Menu Bar

Displays your IP address in the menu bar. Click an address to copy it.

## Notes

- The main view shows IPv4 addresses only.
- The external IP is fetched directly, bypassing the system proxy.
- HTTP fallbacks are not used, so the reported address cannot be spoofed by a plain-HTTP response.
