import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { REDIRECT_URI } from "@/oauth";

interface Props {
  onConnect: () => Promise<void>;
  connectError?: string;
}

export function OAuthSetupGuide({ onConnect, connectError }: Props) {
  const markdown = `
# Connect to Unsplash

${connectError ? `> ⚠️ ${connectError}\n` : ""}Before connecting, add the redirect URI to your Unsplash app — otherwise login or token exchange will fail.

## Steps

1. Open [Unsplash Developer Applications](https://unsplash.com/oauth/applications)
2. Click your application → **Redirect URI & Permissions**
3. Add this URI **exactly**:

\`\`\`
${REDIRECT_URI}
\`\`\`

4. Enable permissions: **Public**, **Read user**, **Write likes**
5. Save, then press **Connect to Unsplash** below

---

**Also check**
- Access Key and Secret Key in Raycast preferences match the app above (no extra spaces)
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
          <Action.CopyToClipboard title="Copy Redirect URI" content={REDIRECT_URI} icon={Icon.Clipboard} />
        </ActionPanel>
      }
    />
  );
}

export default OAuthSetupGuide;
