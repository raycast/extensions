# Pass Changelog

## [1.2.0] - 2024-11-21

- Fix: Delete LC_ALL env variable messing with nix-darwin.

## [1.1.0] - 2024-06-16

- BugFix: Error reading password whose name contains space.
- Pass-otp extension support.
- Add defaultAction preference to set content row behavior.

## [1.0.0] - 2024-05-18

Add MVP functionality

- List gpg files in your `~/.password-store` folder.
- Decrypt selected gpg file and show each row of content by name.
- Paste selected row value to the front-most application.
- Allow copy to clipboart selected row value.
- Allow to show selected row value.
- Show error toast if `pass` is not installed.
- Add `customBrewPath` preference.
