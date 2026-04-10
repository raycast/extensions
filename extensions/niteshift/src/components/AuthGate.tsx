import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import type { ReactNode } from "react";
import { useApiClient } from "../hooks/useApiClient";
import type { ApiClient } from "../api/client";
import type { Environment } from "../lib/env";

export interface AuthedContext {
  client: ApiClient;
  env: Environment;
}

interface Props {
  children: (ctx: AuthedContext) => ReactNode;
}

export function AuthGate({ children }: Props) {
  const ctx = useApiClient();

  if (ctx.client) {
    return <>{children({ client: ctx.client, env: ctx.env })}</>;
  }

  const markdown = `# Niteshift CLI Auth Required

This Raycast extension reads its credentials from the **Niteshift CLI**'s auth file, so you only need to authenticate once.

Run this in your terminal:

\`\`\`
${ctx.authCommand}
\`\`\`

The extension is currently looking for credentials at:

\`${ctx.authFilePath}\`

If you've authed against a different environment, switch using the **Environment** preference (\`⌘ ⇧ ,\`).
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Auth required"
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Auth Command"
            content={ctx.authCommand}
            icon={Icon.Clipboard}
          />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
