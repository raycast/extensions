import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  getApplications,
  getPreferenceValues,
  open,
  closeMainWindow,
} from "@raycast/api";
import { loadPaletteSnapshot, ToolCall } from "./snapshot";

export async function applicationPath(): Promise<string> {
  const preferred = getPreferenceValues<{
    applicationBundlePath?: string;
  }>().applicationBundlePath?.trim();
  const candidates = preferred
    ? [preferred]
    : [
        "/Applications/ShellClick.app",
        "/Applications/Shell Click.app",
        join(homedir(), "Applications/ShellClick.app"),
        ...(await getApplications())
          .filter((app) => app.bundleId === "com.shellclick.app")
          .map((app) => app.path),
      ];
  for (const path of candidates) {
    try {
      await access(
        join(path, "Contents/Resources/bin/shell-click-mcp"),
        constants.X_OK,
      );
      return path;
    } catch {
      /* Try the next installed location. */
    }
  }
  throw new Error(
    "Choose a Shell Click app with the bundled MCP helper in this extension’s preferences.",
  );
}

async function withConnection<T>(
  operation: (call: ToolCall) => Promise<T>,
): Promise<T> {
  const path = await applicationPath();
  const transport = new StdioClientTransport({
    command: join(path, "Contents/Resources/bin/shell-click-mcp"),
    stderr: "ignore",
  });
  const client = new Client({ name: "shell-click-raycast", version: "1.0.0" });
  try {
    await client.connect(transport, { timeout: 10_000 });
    return await operation(async (name, args = {}) => {
      const result = await client.callTool(
        { name, arguments: args },
        undefined,
        { timeout: 30_000 },
      );
      if (result.isError) {
        const content = result.content as { type: string; text?: string }[];
        throw new Error(
          content
            .filter((item) => item.type === "text")
            .map((item) => item.text)
            .join("\n") || "Shell Click could not complete this action.",
        );
      }
      return result.structuredContent;
    });
  } finally {
    await client.close();
  }
}

export async function callTool(
  name: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  return withConnection((call) => call(name, args));
}

export async function loadSnapshot() {
  return withConnection(loadPaletteSnapshot);
}

export async function navigate(url: string) {
  const path = await applicationPath();
  await open(url, path);
  await closeMainWindow();
}
