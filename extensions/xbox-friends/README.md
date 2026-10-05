# Xbox Friends

See which Xbox Live friends are online and what they're playing — without leaving Raycast.

## Features

- **Online status** — friends grouped into Online, Away, and Offline sections
- **Current game** — see exactly what game each friend is playing in real time
- **Last seen** — offline friends show how long ago they were active
- **Gamer Score** — visible on hover for each friend
- **Broadcasting badge** — highlights friends who are live streaming
- **Quick actions** — open their Xbox profile, copy their gamertag, or refresh the list

## Setup

This extension uses the [OpenXBL API](https://xbl.io), a free third-party Xbox Live wrapper.

1. Go to [xbl.io](https://xbl.io) and sign in with your Microsoft account
2. Copy your API key from the dashboard
3. Open the extension in Raycast and paste the key into preferences

Your API key is stored locally in Raycast and is only ever sent to the OpenXBL API.

## Usage

- **⌘R** — Refresh the friends list
- **↵** — Open selected friend's Xbox profile in the browser
- **⌘C** — Copy gamertag to clipboard
