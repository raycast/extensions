# PostHog

Open the web app, search PostHog resources, and run read-only analytics with AI tools.

## Connecting PostHog Accounts

This extension uses OAuth to connect to PostHog. Open the `Manage Accounts` command and choose `Connect Account`.

You can connect multiple accounts. Commands that are scoped to a project let you switch account and project from the project selector.

## Configuring AI Tools

The AI tools use a `phx_` personal API key. Add it in the extension preferences, set `POSTHOG_PERSONAL_API_KEY`, or provide it through a PostHog credentials file.

To create a personal API key:

1. Go to https://us.posthog.com/me/settings or https://eu.posthog.com/me/settings
2. Click "Create personal API key"
3. Copy the token into the "Personal API Key" field in the extension preferences
