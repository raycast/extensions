/**
 * Error view for missing or invalid Gmail OAuth Client ID
 * Provides clear instructions for obtaining and configuring OAuth credentials
 */

import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";

const GOOGLE_CONSOLE_URL = "https://console.cloud.google.com/apis/credentials";

const OAUTH_SETUP_MARKDOWN = `
# Gmail OAuth Client ID Required

To use Gmail as an email source for 2FA codes, you need to configure a Gmail OAuth Client ID.

## Why is this needed?

The OAuth Client ID authenticates this extension with Google's servers, allowing it to securely access your Gmail messages to find 2FA codes.

## How to get your OAuth Client ID

### Step 1: Go to Google Cloud Console
Click "Open Google Console" below or visit:
\`https://console.cloud.google.com/apis/credentials\`

### Step 2: Create or Select a Project
- If you don't have a project, click "Create Project"
- Give it a name like "Raycast 2FA Extension"
- Click "Create"

### Step 3: Enable Gmail API
- In the left sidebar, click "Enabled APIs & services"
- Click "+ ENABLE APIS AND SERVICES"
- Search for "Gmail API"
- Click "Gmail API" and then "Enable"

### Step 4: Create OAuth 2.0 Client ID
- Go back to "Credentials" in the left sidebar
- Click "+ CREATE CREDENTIALS"
- Select "OAuth client ID"
- If prompted to configure OAuth consent screen:
  - Choose "External" user type
  - Fill in required app information
  - Add your email to test users
  - Click "Save and Continue" through the steps
- For Application type, choose **"iOS"** (this is important!)
- Give it a name like "Raycast Extension"
- Leave Bundle ID empty
- Click "Create"

### Step 5: Copy the Client ID
- A popup will show your Client ID
- Copy the Client ID (it looks like: \`xxx.apps.googleusercontent.com\`)
- Click "Open Extension Settings" below
- Paste it into the "Gmail OAuth Client ID" field

### Step 6: Return Here
- Come back to this extension
- The error should be gone and you can add Gmail accounts

---

**Note**: This is completely safe and gives the extension read-only access to your Gmail. You maintain full control and can revoke access anytime from Google Account settings.
`;

export function OAuthErrorView() {
  return (
    <Detail
      markdown={OAUTH_SETUP_MARKDOWN}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text="Configuration Required"
            icon={{ source: Icon.XMarkCircle, tintColor: "#FF0000" }}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Required For" text="Gmail Multi-Account Support" />
          <Detail.Metadata.Label title="Security" text="Read-only access to Gmail" />
          <Detail.Metadata.Label title="Privacy" text="No data leaves your computer" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Setup">
            <Action title="Open Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
            <Action.OpenInBrowser
              title="Open Google Console"
              url={GOOGLE_CONSOLE_URL}
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd"], key: "g" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Help">
            <Action.OpenInBrowser
              title="View Gmail API Documentation"
              url="https://developers.google.com/gmail/api/quickstart/overview"
              icon={Icon.Book}
            />
            <Action.CopyToClipboard
              title="Copy Google Console URL"
              content={GOOGLE_CONSOLE_URL}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
