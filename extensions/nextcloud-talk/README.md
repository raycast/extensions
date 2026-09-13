# Nextcloud Talk for Raycast

Send a message to any user or room in your Nextcloud Talk account without leaving Raycast.

## Setup

1. In Nextcloud, open **Personal Settings → Security → Devices & sessions**.
2. Create a new app password and copy it.
3. Open **Send Message** in Raycast.
4. Enter your Nextcloud instance URL, username, and app password when prompted.

The instance URL can include a path prefix, for example `https://example.com/nextcloud`.

## Usage

Open **Send Message**, select a conversation, write your message, and run the primary **Send Message** action. Conversations are ordered with favorites first and then by recent activity. The last selected conversation is remembered.

Your app password is stored by Raycast as a secure password preference and is only sent to your configured Nextcloud instance.
