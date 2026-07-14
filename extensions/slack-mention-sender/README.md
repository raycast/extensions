# Slack Mention Sender

Send a Slack message to any channel straight from Raycast — and **@mention any person or bot so they actually get pinged**. Unlike Raycast's built-in Slack "Send Message", typed `@names` here are converted into real Slack mentions.

## Features

- **Searchable channel picker** — public and 🔒 private channels you belong to.
- **Multi-select mention picker** — search people *and* apps/bots (bots shown as "(app)"); each becomes a real `<@…>` ping.
- **Message box** — mentions are prepended to your message automatically on send.
- Posts **as you**, exactly like typing in Slack.

## Setup

1. Create a Slack **user token** (`xoxp-…`) with these User Token Scopes: `chat:write`, `channels:read`, `groups:read`, `users:read`.
   - Fastest path: https://api.slack.com/apps → **Create New App** → **From an app manifest**, paste:
     ```yaml
     display_information:
       name: Raycast Sender
     oauth_config:
       scopes:
         user:
           - chat:write
           - channels:read
           - groups:read
           - users:read
     ```
   - **Install to Workspace**, then copy the **User OAuth Token**.
2. Open the **Send Slack Message** command, press **⌘⇧,**, and paste the token into **Slack User Token**.

## Usage

Open **Send Slack Message**, pick a channel, search and select anyone to mention, type your message, and press **⌘↵**. You can only post to channels you're a member of.
