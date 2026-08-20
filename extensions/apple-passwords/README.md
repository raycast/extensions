# Apple Password

Search Apple Passwords from Raycast with live discovery through the local `apw` CLI, cached account metadata in SQLite, and no stored secrets.

## Features

- Search by a full URL, exact domain, or short domain fragment such as `github`.
- Copy a password from Apple Passwords.
- Copy a one-time code when OTP is available.
- Prompt for authentication inline when the daemon needs a code.
- Import a CSV to improve local search coverage.

## Install

1. Install the maintained `apw` CLI:

   ```sh
   brew install bendews/tap/apw
   ```

2. Install Apple's iCloud Passwords extension in Google Chrome, Brave, Edge, or Chromium.
3. Open the `Search Passwords` command in Raycast.
4. If prompted, choose `Request Code`. Apple's native popup temporarily hides Raycast.
5. Reopen Raycast and enter the 6-digit code shown by Apple Passwords.

If the CLI is missing, the extension shows setup instructions and offers the install command directly in Raycast.
CSV import is optional; live search and password retrieval do not require it.

## CSV Import

The extension can import account metadata from an Apple Passwords CSV to improve search results.

1. Open the Apple Passwords app.
2. Choose `File > Export All Passwords to File`.
3. In Raycast, open `Search Passwords`.
4. Use the `Import CSV Cache` action.
5. Select the exported CSV file and continue.

What the CSV import does:

- Imports website domain metadata.
- Imports usernames.
- Imports OTP availability when present.
- Updates the local password cache used for search ranking.

What the CSV import does not do:

- It does not store password values in the password cache.
- It does not store one-time codes in the password cache.
- It does not replace live password retrieval from Apple Passwords.

Imported rows are useful for search quality, but password copy still depends on what the live `apw` lookup can resolve.

## Local Storage

The extension stores only non-secret metadata in a local SQLite database:

- domain
- username
- OTP availability
- first-seen timestamp
- last-seen timestamp
- last-used timestamp

Passwords and one-time codes are never written to disk by the extension.

## Commands

- `Search Passwords`: Search Apple Passwords and copy passwords or one-time codes.
- `Clear Password Cache`: Delete the local password cache file.
