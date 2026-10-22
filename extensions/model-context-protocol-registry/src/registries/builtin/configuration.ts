import type { Action } from "@raycast/api";
import type { RegistryEntry } from "./types";

export function getRaycastServer(entry: RegistryEntry): Action.InstallMCPServer.Props["server"] {
  const server = { name: entry.title, description: entry.description };

  if (entry.remoteUrl) {
    // The Raycast API calls its remote HTTP transport "sse", including Streamable HTTP.
    return { ...server, transport: "sse", url: entry.remoteUrl };
  }

  return { ...server, transport: "stdio", ...entry.configuration };
}

export function getSetupMarkdown(entry: RegistryEntry): string {
  const localSetup = getLocalSetupMarkdown(entry.configuration.command);

  if (entry.remoteUrl) {
    return `## Raycast\n\nRaycast connects directly to this server. Complete sign-in when prompted. Node.js is not required in Raycast.\n\n## Other clients\n\nClaude, Cursor, and Windsurf use the local proxy command shown in the details.\n\n${localSetup}`;
  }

  return localSetup;
}

function getLocalSetupMarkdown(command: string): string {
  switch (command) {
    case "npx":
      return "Requires [Node.js with npm](https://nodejs.org/en/download), which provides `npx`. If installation fails with `spawn npx ENOENT`, check that `node --version` and `npx --version` work in Terminal, then restart the client application. If needed, set the server command to the full path returned by `command -v npx` and include the Node.js directory in the server's `PATH`.";
    case "uvx":
      return "Requires [uv](https://docs.astral.sh/uv/getting-started/installation/), which provides `uvx`. Check that `uvx --version` works in Terminal, then restart the client application. If needed, set the server command to the full path returned by `command -v uvx`.";
    default:
      return "";
  }
}
