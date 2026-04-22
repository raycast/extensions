import { Action, ActionPanel, Detail, openExtensionPreferences } from "@raycast/api";

import { getWebUiBaseUrl } from "./econnect";

export function ConnectionErrorView(props: { title: string; message: string }) {
  let webUiUrl: string | null = null;

  try {
    webUiUrl = getWebUiBaseUrl();
  } catch {
    webUiUrl = null;
  }

  return (
    <Detail
      markdown={`# ${props.title}\n\n${props.message}\n\nThis extension uses the server-side bearer API key described in \`docs/API_KEYS.md\`.\n\nBefore retrying, check:\n- \`Server IP:Port\` points to the backend API, usually \`192.168.x.x:8000\`\n- the API key was created in \`Settings -> API Keys\` on that same server\n- if you entered an \`https://\` URL, either trust the certificate in macOS or enable the self-signed TLS preference`}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          {webUiUrl ? <Action.OpenInBrowser title="Open E-Connect Web UI" url={webUiUrl} /> : null}
        </ActionPanel>
      }
    />
  );
}
