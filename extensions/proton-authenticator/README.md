# Proton Authenticator for Raycast

A Raycast extension to quickly access your TOTP codes from Proton Authenticator.

## Features

### Import secrets

Easily import your secrets into the extension

<video src="https://github.com/user-attachments/assets/f0e5976f-3cf1-4d05-9c82-c855dfbd15ac" width="800" autoplay loop controls></video>

### Copy/paste shortcuts

Convenient shortcuts for copying/pasting current and next codes

<video src="https://github.com/user-attachments/assets/ed7a7207-1428-495a-9bf3-db4a962090a0" width="800" autoplay loop controls></video>

### Reset authenticator data

Wish to import a different JSON file? Reset your data (**Warning: this action cannot be undone**)

<video src="https://github.com/user-attachments/assets/884c6906-b6fd-493b-9926-be981d95d348" width="800" autoplay loop controls></video>

## Limitations

- Unfortunately, there is currently no way of automatically exporting the secrets from the Proton Authenticator app. Instead, you need to export the secrets yourself as a JSON file and upload the JSON file in the tool. This is only a one-time setup, but if you added new secrets to the Proton Authenticator app, then you need to repeat this step again.

- This is an alpha version - so it might not work as seamless as it should be.

## Setup

1. Export your authenticator data from Proton Pass
2. Upload the JSON file to the tool as prompted

## Credits

- The UI was inspired by <https://www.raycast.com/chkpwd/ente-auth>.
