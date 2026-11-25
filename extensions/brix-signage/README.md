# Brix Signage

Control your [Brix](https://brixsignage.com) digital signage screens from Raycast.

## Commands

- **Search Screens**: find a screen by name. See its status, location, content and the most recent picture of the screen. Change what the screen plays or end a message. Send a command, for example "Reload Content", "Restart Player" or "Turn Screen Off".
- **Search Files**: find images, videos, PDFs and other files in your library, with a preview. Play a file on a screen.
- **Search Playlists**: find a playlist, see how many screens play it, and play it on a screen.
- **Post Message to Screens**: show a headline and an optional body for 1 to 1440 minutes. Show the message on all screens, on selected screens, or on the screens at a location. Then the screens go back to their usual content.
- **Screen Status** (menu bar): shows how many screens are offline, and lists them. The menu bar updates every 5 minutes.

## Set up

1. In the Brix console, go to **Settings › AI, API & MCP › API keys**.
2. Select **New key**. Give the key a name, for example "Raycast", and a role. Then select **Create key**. The extension can do only what the role lets it do. A view-only role can search, but cannot change content or send commands.
3. Copy the key. The key starts with `ak_`.
4. Open any Brix command in Raycast and paste the key in **API Key**.

The [API keys guide](https://brixsignage.com/guides/api-keys-and-integrations/) shows each step.

One key works for every region. Brix sends each request to your workspace's region.

## Privacy

The extension sends API requests to `api.brixsignage.com` with your API key. The extension sends the key to no other site. If Brix keeps a file preview on a different site, the extension gets the preview from that site without the key. The extension keeps screen pictures and file previews in the Raycast support folder on your computer. See the [Brix privacy policy](https://brixsignage.com/privacy).

## Support

Write to support@brixsignage.com.
