# Clockify Team

Monitor your Clockify workspace from the Raycast menu bar.

The extension shows:

- how many workspace users were found
- total tracked time for today
- how many people are currently tracking time
- today's leaderboard by user
- each user's current Clockify activity, or whether they are stopped

## Setup

1. Open Clockify in your browser.
2. Go to your profile settings.
3. Create or copy your Clockify API key.
4. Paste the API key into the extension preferences in Raycast.
5. Select the Clockify data region for your workspace.

If you are not sure which region your workspace uses, leave the default selected. The extension will try the available Clockify regions automatically.

## Privacy

The extension talks directly to Clockify from your local Raycast installation. Your API key is stored by Raycast as a password preference and is only sent to Clockify API endpoints.

## Notes

Daily totals are calculated from Clockify's Summary Report API for the current local day. Current activity is read from Clockify's in-progress time entries endpoint.
