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
  if (entry.remoteUrl) {
    return "Raycast connects directly to this server. Complete sign-in when prompted. Node.js is not required in Raycast.";
  }

  switch (entry.configuration.command) {
    case "npx":
      return "Requires [Node.js with npm](https://nodejs.org/en/download), which provides `npx`. If installation fails with `spawn npx ENOENT`, check that `node --version` and `npx --version` work in Terminal, then restart Raycast. If needed, set the server command to the full path returned by `command -v npx` and include the Node.js directory in the server's `PATH`.";
    case "uvx":
      return "Requires [uv](https://docs.astral.sh/uv/getting-started/installation/), which provides `uvx`. Check that `uvx --version` works in Terminal, then restart Raycast. If needed, set the server command to the full path returned by `command -v uvx`.";
    default:
      return "";
  }
}
