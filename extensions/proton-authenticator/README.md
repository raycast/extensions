# Proton Authenticator for Raycast

A Raycast extension to access your TOTP codes from Proton Pass authenticator exports.

## Features

- Touch ID authentication to access TOTP codes
- Shortcuts to copy/paste current and next codes
- Real-time countdown timers with color coding
- Fuzzy search for issuer name and username
- Metadata viewing for each added secret

## Limitations

- Unfortunately, there is currently no way of exporting the secrets from the Proton Authenticator app. Instead, you need to export the secrets yourself as a JSON file and upload the JSON file in the tool. This is only a one-time setup, but if you added new secrets to the Proton Authenticator app, then you need to repeat this step again.

- This is an alpha version - so it might not work as seamless as it should be.

## Setup

1. Export your authenticator data from Proton Pass
2. Upload the JSON file to the tool as prompted

## Notes

- This extension is compatible with only machines running Apple Silicon with a Touch ID.
- The Touch ID authentication expires every 30 minutes for security purposes.

## Credits

- The UI was inspired by <https://www.raycast.com/chkpwd/ente-auth>.
