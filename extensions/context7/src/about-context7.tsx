import { ActionPanel, Action, Icon, Detail } from "@raycast/api";

export default function Command() {
  const markdown = `# ✨ Context7 MCP Server ✨
  This Raycast extension is designed to seamlessly integrate the power of the **Context7 MCP** with RaycastAI, allowing you to **research documentation directly within Raycast AI**.
  It's pre-configured to connect with the Context7 MCP server, providing RaycastAI and at the same time you with relevant documentation snippets based on your natural language queries.
  ## How to Use:
  Simply open AI Chat, add this AI Extension to it and ask your documentation-related questions. The AI will automatically use this extension to find and present the information you need.
  ## Buy me a coffee 😊
  If you find this extension valuable and would like to buy me a coffee for it, Your support is greatly appreciated!
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Buy Me a Coffee"
            url="https://www.buymeacoffee.com/REAV"
            icon={Icon.Heart}
          />
        </ActionPanel>
      }
    />
  );
}
