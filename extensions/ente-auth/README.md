# A Raycast extension that uses your Ente Auth exports

## Features
- Imports: Ability to dynamically import secrets
- TOTP Code Display: Fetches and displays TOTP secrets exported from Ente Auth.
- Dynamic Icons: Displays service-specific favicons when URL placed in notes section.
- Metadata Display: Shows detailed metadata for each TOTP.
- Progress Indicator: Visual progress indicator for the remaining time of the current TOTP code.
- Tag Support: Displays tags associated with each TOTP secret.
- Clipboard Actions: Allows users to copy the current and next TOTP codes to the clipboard with a single click.

## Usage

> [!NOTE]
> The Ente Auth [CLI](https://github.com/ente-io/ente/tree/main/cli) is required.

## Setup

#### Automated

Run `Import Secrets` from Raycast. This will create a `~/Documents/ente` directory and a file named `ente_auth.txt`.

#### Manual

As explained [here](https://help.ente.io/auth/migration-guides/export), run:
```ente account update --app auth --email <email> --dir <path>```.

Or perform the same actions but through the UI as long as the file is placed in the `~/Documents/ente` folder.
