# Power Management

Change Power Management Settings of the system

## Authenticate with Touch ID

Changing power management settings requires administrator privileges. By default this is done via username & password. If you would rather use your fingerprint to authenticate you must modify your `sudo` configuration (**note:** this change will apply to `sudo` globally, not just within Raycast).

### macOS Sonoma (14) and Later

1. Copy `/etc/pam.d/sudo_local.template` to `sudo_local`:
   ```bash
   sudo cp /etc/pam.d/sudo_local.template /etc/pam.d/sudo_local
   ```
2. Remove the comment character (`#`) from the `auth` line in `sudo_local`:
   ```
   # sudo_local: local config file which survives system update and is included for sudo
   # uncomment following line to enable Touch ID for sudo
   auth       sufficient     pam_tid.so
   ```

### macOS Ventura (13) and Earlier

1. Open `/etc/pam.d/sudo` in your preferred text editor
2. Add `auth sufficient pam_tid.so` to the list of `auth` entries:
   ```
   # sudo: auth account password session
   auth       sufficient     pam_tid.so
   auth       sufficient     pam_smartcard.so
   auth       required       pam_opendirectory.so
   account    required       pam_permit.so
   password   required       pam_deny.so
   session    required       pam_permit.so
   ```
3. Save and close the file

**Note:** `/etc/pam.d/sudo` is a default macOS file so it will be overwritten by system updates. You will have to reapply this change after each time you update macOS.
