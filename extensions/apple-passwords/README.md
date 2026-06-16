# Apple Password

Search Apple Passwords from Raycast with live discovery through the local `applepw` CLI, cached account metadata in SQLite, and no stored secrets.

## Features

- Search by domain or email fragment.
- Copy a password from Apple Passwords.
- Copy a one-time code when OTP is available.
- Prompt for authentication inline when the daemon needs a code.
- Import a CSV to improve local search coverage.

## Install

1. Install the `applepw` CLI:

   ```sh
   brew install alecharmon/tap/applepw
   ```

2. Open the `Search Passwords` command in Raycast.
3. If prompted, enter the code from Apple Passwords to authenticate the local daemon.

If the CLI is missing, the extension shows setup instructions and offers the install command directly in Raycast.

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

Imported rows are useful for search quality, but password copy still depends on what the live `applepw` lookup can resolve.

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
