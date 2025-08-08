import { Detail, ActionPanel, Action } from "@raycast/api";

export default function Command() {
  return (
    <Detail
      markdown={`# How to connect Logggai

To use this extension, you need to provide your Logggai session token.

**Steps:**
1. Run \`npx logggai login\` in your terminal **OR** sign in on [logggai.run](https://logggai.run)
2. Copy your session token from the CLI (\`logggai config --get sessionToken\`) or from your dashboard
3. Paste the token in the "Session Token" field in this extension's preferences

Once connected, you can create, list, and publish posts directly from Raycast!
`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Logggai Dashboard" url="https://logggai.run" />
        </ActionPanel>
      }
    />
  );
}
