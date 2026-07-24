import { homedir } from "node:os";

import { McpManager } from "./components/mcp-manager";

export default function ManageMcpsCommand() {
  return <McpManager workingDirectory={homedir()} />;
}
