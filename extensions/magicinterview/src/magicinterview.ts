import { getPreferenceValues } from "@raycast/api";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export const ORIGIN = "https://magicinterview.ai";
export type Conversation = {
  id: string;
  title: string;
  company: string;
  role: string;
  purpose: string;
  projectTitle?: string;
  activeUrl: string;
  updatedAt: string;
};
export type ConversationPage = {
  conversations: Conversation[];
  hasNextPage: boolean;
  nextOffset: number | null;
};

export async function callTool<T>(
  operation: string,
  args: Record<string, unknown>,
  write = false,
): Promise<T> {
  const { apiToken } = getPreferenceValues<Preferences>();
  const client = new Client({
    name: "magicinterview-raycast",
    version: "1.0.0",
  });
  try {
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${ORIGIN}/mcp`), {
        requestInit: {
          headers: { Authorization: `Bearer ${apiToken.trim()}` },
        },
      }),
    );
    const result = await client.callTool({
      name: write ? "magicinterview_execute_tool" : "magicinterview_read_tool",
      arguments: { toolName: operation, arguments: args },
    });
    if (result.isError) {
      const message = Array.isArray(result.content)
        ? result.content
            .filter((item) => item.type === "text")
            .map((item) => item.text)
            .join("\n")
        : "MagicInterview could not complete the request.";
      throw new Error(message);
    }
    if (result.structuredContent) return result.structuredContent as T;
    const content = Array.isArray(result.content)
      ? result.content.find((item) => item.type === "text")
      : undefined;
    if (!content || content.type !== "text")
      throw new Error("MagicInterview returned an empty response.");
    return JSON.parse(content.text) as T;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Connection failed.";
    if (/401|403|unauthorized|invalid.*token/i.test(message)) {
      throw new Error(
        "Reconnect using a valid token from MagicInterview Settings → AI client access.",
      );
    }
    throw error;
  } finally {
    await client.close().catch(() => undefined);
  }
}

export function conversationUrl(conversation: Conversation): string {
  // Use the canonical product route, without trusting arbitrary URLs from remote data.
  return `${ORIGIN}/app?conversation=${encodeURIComponent(conversation.id)}`;
}
