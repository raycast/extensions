# Flush DNS

Flush the DNS cache

Works for macOS 10.6+ and Windows

## macOS Cache Coverage

On modern macOS, Flush DNS clears both OS-level host-resolution caches:

- `/usr/bin/dscacheutil -flushcache` clears the Directory Service/libinfo cache.
- `/usr/bin/killall -HUP mDNSResponder` purges the separate `mDNSResponder` DNS-reply cache.

Browsers and other applications may maintain additional caches that this extension does not clear.

## Authenticate with Touch ID on macOS

Flushing the macOS caches requires administrator privileges. Flush DNS uses Touch ID when `sudo` is configured with the `pam_tid.so` PAM module. This configuration applies to `sudo` globally, not only to Raycast.

### macOS Sonoma (14) and Later

1. Copy Apple's local sudo template:
   ```bash
   sudo cp /etc/pam.d/sudo_local.template /etc/pam.d/sudo_local
   ```
2. Uncomment this line in `/etc/pam.d/sudo_local`:
   ```text
   auth       sufficient     pam_tid.so
   ```

### macOS Ventura (13) and Earlier

Add this line to the `auth` entries in `/etc/pam.d/sudo`:

```text
auth       sufficient     pam_tid.so
```

macOS updates may overwrite `/etc/pam.d/sudo`. If Touch ID is unavailable or not enabled for `sudo`, Flush DNS retains the existing administrator password prompt. Cancelling or failing a Touch ID attempt stops the flush instead of opening a second password prompt.
