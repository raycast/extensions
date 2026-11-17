import { getPreferenceValues, open } from "@raycast/api";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

/// The commands talk to the MCP binary inside Anycap.app: newline-delimited
/// JSON-RPC over stdio, the same store as the app. No server, no account, and
/// the app need not be open.

export function mcpBinary(): string {
  const { appPath } = getPreferenceValues<Preferences>();
  const candidates = [appPath, "/Applications/Anycap.app", `${homedir()}/Applications/Anycap.app`].filter(
    (p): p is string => !!p && p.trim().length > 0,
  );
  for (const app of candidates) {
    const bin = `${app.replace(/\/+$/, "")}/Contents/MacOS/anycap-mcp`;
    if (existsSync(bin)) return bin;
  }
  throw new Error("Anycap.app not found. Set its path in the extension preferences.");
}

/// The environment a helper is started with: the caller's, less Anycap's own
/// test switches. ANYCAP_STORE_DIR sends the helper to a test store, and a
/// save would land where the app never looks.
export function cleanEnvironment(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(env).filter(([key]) => !key.startsWith("ANYCAP_")));
}

export type ToolResult = {
  content: ({ type: "text"; text: string } | { type: "image"; data: string; mimeType: string })[];
};

export async function callToolResult(
  name: string,
  args: Record<string, unknown>,
  client = "Raycast",
): Promise<ToolResult> {
  const bin = mcpBinary();
  return await new Promise((resolve, reject) => {
    const child = spawn(bin, [], { stdio: ["pipe", "pipe", "ignore"], env: cleanEnvironment() });
    let buffer = "";
    let settled = false;
    const timer = setTimeout(() => finish(() => reject(new Error("Anycap did not answer."))), 15000);
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      fn();
    };
    const consume = (line: string) => {
      if (settled || !line.trim()) return;
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        return;
      }
      if (message?.id !== 2) return;
      const text: string = message.result?.content?.[0]?.text ?? message.error?.message ?? "";
      if (message.result?.isError || message.error) finish(() => reject(new Error(text || "Anycap error")));
      else finish(() => resolve(message.result ?? { content: [] }));
    };
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      if (settled) return;
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        consume(line);
        if (settled) return;
      }
    });
    child.on("error", (error) => finish(() => reject(error)));
    child.stdin.on("error", (error) => finish(() => reject(error)));
    child.on("close", (code, signal) => {
      // The final complete reply may end at EOF instead of a newline.
      consume(buffer);
      finish(() =>
        reject(new Error(`Anycap helper stopped before replying (${signal ?? `exit ${code ?? "unknown"}`}).`)),
      );
    });
    child.stdin.write(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { clientInfo: { name: client, version: "1.0.0" } },
      }) + "\n",
    );
    child.stdin.write(
      JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name, arguments: args } }) + "\n",
    );
  });
}

export async function callTool(name: string, args: Record<string, unknown>, client = "Raycast"): Promise<string> {
  const result = await callToolResult(name, args, client);
  return result.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

export function asURL(text: string): string | null {
  try {
    const url = new URL(text.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export type Kind = "link" | "note" | "image" | "file" | "audio";

export type CaptureRow = {
  id: string;
  kind: string;
  title: string;
  subtitle?: string;
  url?: string;
  related?: boolean;
};

/// One result line looks like: "- [link] Title · summary · https://url · id:UUID · match: …".
/// A summary that ends in #tags runs onto the next line, and meaning matches
/// follow a "Related by meaning:" line.
export function parseCaptureLines(text: string): CaptureRow[] {
  const lines: { text: string; related: boolean }[] = [];
  let related = false;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("Related by meaning")) {
      related = true;
      continue;
    }
    if (line.startsWith("- [")) lines.push({ text: line, related });
    else if (lines.length > 0) lines[lines.length - 1].text += " " + line;
  }
  const rows: CaptureRow[] = [];
  for (const { text: line, related } of lines) {
    const match = line.match(/^- \[(\w+)\] (.*)$/);
    if (!match) continue;
    const parts = match[2].split(" · ").map((p) => p.trim());
    const idPart = parts.findLast((p) => p.startsWith("id:"));
    if (!idPart) continue;
    const url = parts.find((p) => p.startsWith("http://") || p.startsWith("https://"));
    const rest = parts.filter((p) => p !== idPart && p !== url && !p.startsWith("match:"));
    rows.push({
      id: idPart.slice(3),
      kind: match[1],
      title: rest[0] || "Untitled",
      subtitle: rest.slice(1).join(" · ") || undefined,
      url,
      related,
    });
  }
  return rows;
}

export type Folder = { name: string; emoji?: string; count: number; description?: string };

/// "- 🎨 Design (10): UI references" and "- Inbox (154): captured, not yet filed".
export function parseFolders(text: string): Folder[] {
  const folders: Folder[] = [];
  for (const raw of text.split("\n")) {
    const match = raw.trim().match(/^- (.+?) \((\d+)\):?\s*(.*)$/);
    if (!match) continue;
    const label = match[1];
    const emoji = label.match(/^(\p{Extended_Pictographic}️?)\s+/u)?.[1];
    folders.push({
      name: emoji ? label.slice(emoji.length).trim() : label,
      emoji,
      count: Number(match[2]),
      description: match[3] || undefined,
    });
  }
  return folders;
}

export type Collection = { name: string; emoji?: string; count: number };

/// "- music (8 items)" and "- ✅ Done (2 items)".
export function parseCollections(text: string): Collection[] {
  const collections: Collection[] = [];
  for (const raw of text.split("\n")) {
    const match = raw.trim().match(/^- (.+?) \((\d+) items?\)/);
    if (!match) continue;
    const emoji = match[1].match(/^(\p{Extended_Pictographic}️?)\s+/u)?.[1];
    collections.push({
      name: emoji ? match[1].slice(emoji.length).trim() : match[1],
      emoji,
      count: Number(match[2]),
    });
  }
  return collections;
}

export function deepLink(id: string): string {
  return `anycap://item/${id}`;
}

export async function openInAnycap(id: string) {
  await open(deepLink(id));
}

/// Saves a link or a note and says how it went, in the HUD's few words.
export async function save(args: { url?: string; text?: string; title?: string }): Promise<string> {
  const reply = await callTool("save", args);
  return reply.startsWith("Saved") ? "Saved to Anycap" : reply;
}
