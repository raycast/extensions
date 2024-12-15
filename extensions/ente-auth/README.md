# A Raycast extension that uses your Ente Auth exports

## Features

- Imports: Ability to dynamically import secrets
- TOTP Code Display: Fetches and displays TOTP secrets exported from Ente Auth.
- Sorted Data: Most used TOTP codes will be displayed at the top. Use ⌘ + [Number] to select.
- Dynamic Icons: Displays service-specific favicons when URL placed in notes section.
- Metadata Display: Shows detailed metadata for each TOTP.
- Progress Indicator: Visual progress indicator for the remaining time of the current TOTP code.
- Tag Support: Displays tags associated with each TOTP secret.
- Clipboard Actions: Allows users to copy the current and next TOTP codes to the clipboard with a single click.

## Usage

> The Ente Auth [CLI](https://github.com/ente-io/ente/tree/main/cli) is required.

## Setup

#### Adding your account

As explained [here](https://github.com/ente-io/ente/tree/main/cli#accounts), run:
`ente account add` to login into an existing account.
If you wish to update your account information, run the below:
`ente account update --app auth --email <email> --dir <path>`.

## Next Steps

#### Using Raycast

- Run `Export Secrets`. This will create a `~/Documents/ente` directory and a file named `ente_auth.txt`.
- Run `Import Secrets`. This will import all serialized items into Raycast encrypted database.

#### Using Ente

To perform a manual import, run: `ente export`, then run `Import Secrets`.
Or perform the same actions but through the UI as long as the file is placed in the `~/Documents/ente` folder.

## Optionally

You can delete exported secrets from it's exported path by using `Delete Export`.
