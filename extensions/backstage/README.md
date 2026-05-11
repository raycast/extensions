# Backstage

Shortcuts for the [Backstage](https://backstage.io/) catalog in your company.

## Configuring Google Cloud IAP

In the case of your Backstage instance being behind a Google Cloud IAP, you need to configure two OAuth2 Client IDs in the preferences.

First, `Google OAuth Client ID for IAP` is existing Client ID that configured to your IAP.

Second, `Google OAuth Client ID for Raycast` is a new Client ID that you need to create for this extension:

1. Go to https://console.cloud.google.com/apis/credentials
2. Select the project that your IAP is configured.
3. Create a new client by following [this instruction](https://developers.raycast.com/utilities/oauth/getting-google-client-id#step-5-create-an-oauth-client-id).
