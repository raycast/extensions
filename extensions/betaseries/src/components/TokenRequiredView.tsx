import {
  Action,
  ActionPanel,
  Detail,
  openExtensionPreferences,
} from "@raycast/api";

const TOKEN_COMMAND = `curl -X POST "https://api.betaseries.com/members/auth" \\
  -d "key=APIKEY" \\
  -d "login=LOGIN" \\
  -d "password=$(echo -n 'PASSWORD' | md5)"`;

const markdown = `# BetaSeries Token Required

Get your Auth Token for user-specific features.

For now, this version only supports classic login and password authentication (Apple, Facebook, and Google logins are not yet supported).

Run the following command in your terminal:

\`\`\`bash
${TOKEN_COMMAND}
\`\`\`

Copy the token from the response and paste it into the **BetaSeries Token** field in extension preferences.
`;

export function TokenRequiredView() {
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Auth Command"
            content={TOKEN_COMMAND}
          />
          <Action
            title="Open Extension Preferences"
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
