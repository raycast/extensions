/**
 * Login to Kalpa Command
 * Opens the web app to get an API token for the extension
 */

import { Action, ActionPanel, Detail, openExtensionPreferences } from "@raycast/api";
import { getApiToken, tokenIsExpired } from "./utils/auth";

// Hardcoded production URL
const KALPA_APP_URL = "https://usekalpa.com";

export default function LoginCommand() {
  const token = getApiToken();
  const expired = token ? tokenIsExpired(token) : null;

  const hasValidToken = token && expired === false;
  const hasExpiredToken = token && expired === true;

  const authUrl = `${KALPA_APP_URL}/raycast`;

  if (hasValidToken) {
    return (
      <Detail
        markdown={`
# ✅ You're connected to Kalpa

Your API token is valid and working.

## What you can do:
- **Search Links** - Find your saved links
- **Browse Universes** - Explore your collections
- **Recent Links** - See your latest saves
- **Quick Save** - Save the current browser URL

---

*If you're having issues, try regenerating your token.*
        `}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon="gear" onAction={openExtensionPreferences} />
            <Action.OpenInBrowser title="Regenerate Token" url={authUrl} />
          </ActionPanel>
        }
      />
    );
  }

  if (hasExpiredToken) {
    return (
      <Detail
        markdown={`
# ⚠️ Your token has expired

Your Kalpa API token has expired and needs to be refreshed.

## To get a new token:
1. Click **"Get New Token"** below
2. Sign in to Kalpa if needed
3. Copy the new token
4. Paste it in extension preferences

---

*Tokens expire after 1 hour for security.*
        `}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Get New Token" url={authUrl} icon="key" />
            <Action title="Open Extension Preferences" icon="gear" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  // No token at all
  return (
    <Detail
      markdown={`
# 🔑 Connect to Kalpa

To use the Kalpa extension, you need to connect your account.

## Setup Instructions:

1. **Click "Login to Kalpa"** below to open the web app
2. **Sign in** to your Kalpa account
3. **Copy** the API token shown on the page
4. **Open Extension Preferences** and paste the token

---

*Need help? Visit [usekalpa.com/support](https://usekalpa.com/support)*
      `}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Login to Kalpa" url={authUrl} icon="link" />
          <Action title="Open Extension Preferences" icon="gear" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
