# Proton Authenticator for Raycast

A Raycast extension to quicly access your TOTP codes from Proton Pass authenticator exports.

## Features

### Import secrets

Easily import your secrets into the extension

<video src="https://github.com/user-attachments/assets/f0e5976f-3cf1-4d05-9c82-c855dfbd15ac" width="800" autoplay loop controls></video>

### Touch ID authentication

Secure your codes with Touch ID authentication

<video src="https://github.com/user-attachments/assets/7807dc36-d675-4950-abde-0369efee0eae" width="800" autoplay loop controls></video>

### Copy/paste shortcuts

Convenient shortcuts for copying/pasting current and next codes

<video src="https://github.com/user-attachments/assets/ed7a7207-1428-495a-9bf3-db4a962090a0" width="800" autoplay loop controls></video>

### Enable/disable Touch ID

If that's how you roll, you may disable Touch ID if you wish

<video src="https://github.com/user-attachments/assets/47cf13f3-51b7-48a0-ae17-1ddf3554a045" width="800" autoplay loop controls></video>

### Control authentication timeout

Modify how long authentication sessions should last before they expire

<video src="https://github.com/user-attachments/assets/b7f03aad-198c-415f-9ec7-c7f6da14f72b" width="800" autoplay loop controls>
</video>

### Clear authentication session

Passing your laptop to someone else? Make sure to clear authentication before doing so!

<video src="https://github.com/user-attachments/assets/32c28d5a-2a56-4178-9ff4-6fa5855e0fa5" width="800" autoplay loop controls></video>

### Reset authenticator data

Wish to import a different JSON file? Reset your data (**Warning: this action cannot be undone**)

<video src="https://github.com/user-attachments/assets/884c6906-b6fd-493b-9926-be981d95d348" width="800" autoplay loop controls></video>

## Limitations

- Unfortunately, there is currently no way of automatically exporting the secrets from the Proton Authenticator app. Instead, you need to export the secrets yourself as a JSON file and upload the JSON file in the tool. This is only a one-time setup, but if you added new secrets to the Proton Authenticator app, then you need to repeat this step again.

- This is an alpha version - so it might not work as seamless as it should be.

## Setup

1. Export your authenticator data from Proton Pass
2. Upload the JSON file to the tool as prompted

## Notes

- This extension is compatible with only machines running Apple Silicon with a Touch ID.

## Credits

- The UI was inspired by <https://www.raycast.com/chkpwd/ente-auth>.
