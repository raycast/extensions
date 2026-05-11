import { Action, ActionPanel, Clipboard, Detail, getPreferenceValues, showToast, Toast } from "@raycast/api";

export default function SetupMCPCommand() {
  const { baseUrl, apiToken } = getPreferenceValues<Preferences.SetupMcp>();

  const hasToken = Boolean(apiToken?.trim());

  function buildConfig(withToken: boolean) {
    return JSON.stringify(
      {
        mcpServers: {
          affine: {
            command: "affine-mcp",
            env: {
              AFFINE_BASE_URL: baseUrl || "https://app.affine.pro",
              AFFINE_API_TOKEN: withToken ? apiToken.trim() : "YOUR_TOKEN",
              AFFINE_WORKSPACE_ID: "optional-workspace-id",
            },
          },
        },
      },
      null,
      2,
    );
  }

  const configSnippet = hasToken ? buildConfig(false) : buildConfig(false);

  async function copyConfigWithToken() {
    await Clipboard.copy(buildConfig(true));
    await showToast(Toast.Style.Success, "Config copied (includes your API token)");
  }

  const markdown = `# Use AFFiNE with Raycast AI

You already have **quick commands** from this extension. To also use **Raycast AI** with your AFFiNE docs (summarize, create, append, comments), add the AFFiNE MCP server.

## 1. Install the MCP server

\`\`\`bash
npm i -g affine-mcp-server
\`\`\`

(Or use \`npx\` in the config below: \`"command": "npx"\`, \`"args": ["-y", "-p", "affine-mcp-server", "affine-mcp"]\`.)

## 2. Add the server in Raycast

- Open **Raycast** → **Settings** → **MCP** (or **Features** → **AI** → **MCP**).
- Click **Install Server** (or **Add** / edit config).
- Use the same **AFFiNE URL** and **API Token** as this extension. For the **desktop app** (macOS/Windows/Linux): use \`https://app.affine.pro\` and a token from Cloud — the desktop app does not expose an API; enable Cloud sync so the same data is available.

For **self-hosted**: set **AFFiNE URL** in extension preferences to your instance (e.g. \`http://localhost:3010\`) and create a token there. (Desktop app: use Cloud above.)

${hasToken ? "> **Tip:** Your API token is configured. Use **Copy Config with Token** below to get a ready-to-paste config.\n\n" : ""}Example config${hasToken ? " (token masked for safety — use the copy action for the real value)" : " (replace `YOUR_TOKEN` with your real token)"}:

\`\`\`json
${configSnippet}
\`\`\`

## 3. Use it

- In **AI Chat** or **AI Commands**, @-mention the **AFFiNE** MCP server.
- Ask to search workspaces, read a doc, create or append content, etc.

Same credentials as this extension; no extra setup.
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url="https://github.com/DAWNCR0W/affine-mcp-server#readme"
            title="Open MCP Server Readme"
          />
          {hasToken && <Action title="Copy Config with Token" onAction={copyConfigWithToken} />}
        </ActionPanel>
      }
    />
  );
}
