# Focus Tidbyt

Sync Raycast Focus sessions to a Tidbyt/Tronbyt display.

## Setup

1. Create two Apple Shortcuts using Raycast Focus actions:
   - **Raycast Focus - Start**: Start Focus Session (accepts text input in the format `minutes|title`).
     Example: `25|Deep Work`
   - **Raycast Focus - Complete**: Complete Focus Session.
   - Suggested steps for **Raycast Focus - Start**:
     - Get Text from Input
     - Split Text by `|`
     - Get Item 1 → use as Duration
     - Get Item 2 → use as Title (optional)
     - Note: `|` characters in the title are replaced with `/`.
2. Choose your push provider:
   - **Tidbyt (official)**: In the Tidbyt mobile app, go to Settings → Get API key and copy the **Device ID** and **API key** (paste the raw key with no `Authorization:` prefix or line breaks). Tidbyt pushes use `pixlet push` under the hood; set **Pixlet Path** if needed.
   - **Tronbyt (self-hosted)**: Find your Tronbyt server URL and device ID.
     - **Base URL**: Use the URL where the Tronbyt Server web app loads (default `http://localhost:8000` if running locally).
     - **Device ID**: In the Tronbyt Server web app, open the Devices list and copy the ID shown for your device.
3. Configure the extension preferences in Raycast:
   - Set **Push Provider** to Tidbyt or Tronbyt.
   - Fill in the matching device credentials.
   - Optional installation ID and update interval.
4. Run **Start Focus + Tidbyt** to begin.
   - If preferences are missing (or the device can’t be reached), it will open a browser preview instead.
   - **Preview Tidbyt Frame** works without a device (no preferences required).
   - **Test Push Tidbyt** sends a sample image using the selected provider to verify connectivity.

## Notes

- Background refresh runs every minute. The `Update Interval` preference only controls how often a push is sent.
- Tidbyt cleanup uses the API endpoint to remove the installation; some backends may ignore it.
- **Preview Tidbyt Frame** renders a local WebP preview (no device required).

## Troubleshooting

- Preview fails: run `npm install` in the extension folder and try again.
- Focus doesn’t start: confirm your Shortcuts are named exactly as the preferences (`Raycast Focus - Start` and `Raycast Focus - Complete` by default).
- Tidbyt doesn’t update: verify the selected provider and credentials in preferences (Tidbyt API key + device ID, or Tronbyt base URL + device ID). Run **Test Push Tidbyt** to confirm connectivity.
- Background refresh not running: run **Refresh Tidbyt** once manually to enable background refresh, then check Raycast’s extension preferences to ensure it’s enabled.
