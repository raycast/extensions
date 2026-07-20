import { Action, ActionPanel, Detail, Icon } from "@raycast/api";

interface Props {
  onConnect: () => Promise<void>;
  connectError?: string;
}

export function OAuthSetupGuide({ onConnect, connectError }: Props) {
  const markdown = `
# Connect to Unsplash

${connectError ? `> ⚠️ ${connectError}\n` : ""}Before connecting, add the redirect URI to your Unsplash app — otherwise the login page will show an error.

## Steps

1. Open [Unsplash Developer Applications](https://unsplash.com/oauth/applications)
2. Click your application → **Redirect URI & Permissions**
3. Add this URI exactly:

\`\`\`
https://raycast.com/redirect
\`\`\`

4. Save, then press **Connect to Unsplash** below

---

**Also check**
- Access Key and Secret Key in Raycast preferences match the app above
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Connect to Unsplash"
      actions={
        <ActionPanel>
          <Action title="Connect to Unsplash" icon={Icon.PersonCircle} onAction={onConnect} />
          <Action.OpenInBrowser
            title="Open Unsplash Applications"
            url="https://unsplash.com/oauth/applications"
            icon={Icon.Globe}
          />
          <Action.CopyToClipboard
            title="Copy Redirect URI"
            content="https://raycast.com/redirect"
            icon={Icon.Clipboard}
          />
        </ActionPanel>
      }
    />
  );
}

export default OAuthSetupGuide;
