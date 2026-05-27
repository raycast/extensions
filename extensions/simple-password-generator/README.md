# Simple Password Generator

Generate secure passwords, passphrases, and PINs directly from Raycast.

## Features

- **Password Generation**: Customizable length and character sets (uppercase, lowercase, digits, symbols).
- **Passphrase Generation**: Memorable passphrases using the EFF wordlist (Diceware).
- **PIN Generation**: Quick numeric codes for simple authentication.
- **Entropy Estimation**: View the strength of your generated secrets in bits of entropy.
- **History**: Keep track of the last 10 generated passwords for quick access.
- **Auto-copy**: Option to automatically copy the generated secret to your clipboard.
- **Privacy First**: Everything is generated locally on your machine. No data ever leaves your computer.

## Usage

1. Open the **Generate Password** command.
2. Select the type of secret you want to generate (Password, Passphrase, or PIN).
3. Adjust the parameters to your liking.
4. The preview updates in real-time.
5. Press **Enter** to copy the generated secret and save it to your history.

## Shortcuts

- `Enter`: Copy preview to clipboard and save to history.
- `Cmd + Shift + C`: Generate a new secret and copy it.
- `Cmd + V`: Paste the secret directly into the active application.
- `Cmd + H`: View generation history.
- `Cmd + R`: Regenerate the preview.
- `Cmd + Shift + R`: Reset all parameters to defaults.

## Security

This extension uses the `crypto.getRandomValues()` API for cryptographically strong random number generation. Entropy is calculated based on the size of the character set and the length of the secret.
