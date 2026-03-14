export type McpClient = {
  value: string;
  title: string;
};

export const MCP_CLIENTS: McpClient[] = [
  { value: "claude", title: "Claude Desktop" },
  { value: "claude-code", title: "Claude Code" },
  { value: "cursor", title: "Cursor" },
  { value: "codex", title: "Codex" },
  { value: "gemini-cli", title: "Gemini CLI" },
  { value: "windsurf", title: "Windsurf" },
  { value: "cline", title: "Cline" },
  { value: "roocode", title: "Roo Code" },
  { value: "opencode", title: "OpenCode" },
  { value: "goose", title: "Goose" },
  { value: "vscode", title: "VS Code" },
  { value: "vscode-insiders", title: "VS Code Insiders" },
  { value: "witsy", title: "Witsy" },
  { value: "enconvo", title: "Enconvo" },
  { value: "boltai", title: "BoltAI" },
  { value: "amazon-bedrock", title: "Amazon Bedrock" },
  { value: "amazonq", title: "Amazon Q" },
  { value: "tome", title: "Tome" },
  { value: "librechat", title: "LibreChat" },
];
