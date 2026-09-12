# Have I Been Pwned

A Raycast extension to check if your email or password has been exposed in a data breach, powered by [Have I Been Pwned](https://haveibeenpwned.com).

## Features

- Check if an email address has appeared in any known data breach with the "Breached Account" command
- Check if a password has been exposed using privacy-safe k-anonymity (your password is never sent to any server) with the "Pwned Password" command
- Keep a history of your lookups

## API Key

An API key is required for the **Breached Account** command. You can obtain one at [haveibeenpwned.com/API/Key](https://haveibeenpwned.com/API/Key).

Once you have your key, add it in the extension preferences (`⌘ ,`).

The **Pwned Password** command does not require an API key — it uses the free [Pwned Passwords](https://haveibeenpwned.com/Passwords) API with a k-anonymity model, meaning only the first 5 characters of your password's SHA-1 hash are ever sent, and your plaintext password never leaves your device.
