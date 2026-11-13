# PwPush for Raycast

Create secure, expiring secret pushes with [PwPush](https://pwpush.com) directly from Raycast.

## Features

- **PwPush API v2** support with JSON and multipart file uploads.
- Create text, URL, QR-code, and file pushes.
- Set expiry by duration (minutes to months) and number of views.
- Optional passphrase, viewer deletion, and retrieval step.
- Works with the public `eu.pwpush.com` service or a self-hosted instance.
- Optional API-key authentication with workspace selection.
- Push history stored locally.
- Generated secret links are copied to the clipboard and shown in the result view.

## Setup

Open the extension preferences to configure:

- **Server URL**: leave empty to use the public `https://eu.pwpush.com` service (Password Pusher Pro EU), or enter your self-hosted URL.
- **API Key**: add your API key to access workspaces and create pushes associated with your account.

## Usage

1. Run **Create Push** from Raycast.
2. Choose the push **Kind** (Text, URL, QR Code, File).
3. Enter the payload and attach files if needed.
4. Adjust options such as expiry duration, views, passphrase, and workspace.
5. Submit. The secret link is copied to your clipboard and shown on the result screen.
6. Open **Push History** to see, copy, open, or expire recent pushes.

## Commands

- **Create Push** — create a new PwPush secret link.
- **Push History** — browse and manage recently created pushes.

## Credits

- [PwPush](https://pwpush.com) by Peter Giacomo Lombardo.
