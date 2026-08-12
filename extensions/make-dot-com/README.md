# Make.com Scenarios

Browse and manage your Make.com scenarios from Raycast: list scenarios, view details, inspect executions, and open items in Make.com.

## Setup

1. **Create a Make API token**
   - In Make.com, create an API token with access to your Organizations/Teams/Scenarios (and Scenario Logs/Executions if you want execution details).
2. **Find your Make region base URL**
   - Examples: `https://eu1.make.com`, `https://us1.make.com`.
3. **Configure extension preferences**
   - Open Raycast → Extensions → Make.com Scenarios → Preferences.

## Preferences

- **Make Base URL**: Your Make region base URL (e.g. `https://eu1.make.com`).
- **Make API Token**: Stored by Raycast as a password preference and sent as `Authorization: Token <token>`.
- **Show User Emails**: Shows creator/updater email addresses in Scenario Details (may be sensitive).
- **Allow Execution Payload Copy**: Allows rendering/copying execution outputs and error JSON (may contain secrets/PII).

## Security & Privacy

- **Credential handling**: Your API token is only read from Raycast preferences and is never written to disk by this extension.
- **Local storage**: The selected organization/team is stored in Raycast LocalStorage (IDs + names).
- **Potentially sensitive data**:
  - Scenario Details can include user identities (names/emails).
  - Execution outputs/errors can include payload data (including secrets/PII).
  - By default, this extension disables displaying/copying execution payloads.

## Troubleshooting

- **401/403**: Your token is invalid or missing scopes. Recreate the token and update preferences.
- **429**: Rate limited by Make.com. Wait and retry.
- **Wrong region**: If you see auth or “not found” errors, double-check the base URL matches your Make region.

## Media

If you add screenshots/images to this README, place them in `media/` and link them from here (Raycast Store requirement).


