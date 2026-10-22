import { spawn } from "node:child_process";

/**
 * Talks to `sizewise-mcp`, the Model Context Protocol server Sizewise carries for AI assistants
 * such as Claude: one question per run, over its standard input and output.
 */

/** What the server printed and whether it ran out of time. */
export type ServerOutput = { stdout: string; timedOut: boolean };

const timeout = 60_000;

/**
 * The messages that start a session with the server and ask it one question: the Model Context
 * Protocol's handshake, then the tool call, one JSON-RPC message per line.
 */
export function requestLines(tool: string, args: Record<string, unknown>): string {
  const messages = [
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "raycast-sizewise", version: "1.0" },
      },
    },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: tool, arguments: args } },
  ];
  return messages.map((message) => JSON.stringify(message)).join("\n") + "\n";
}

/** Reads the answer to the tool call from what the server printed, or throws its error. */
export function parseAnswer(output: ServerOutput): string {
  if (output.timedOut) throw new Error("Sizewise took too long to read the saved scan.");
  for (const line of output.stdout.split("\n")) {
    if (line.trim() === "") continue;
    const message = JSON.parse(line);
    if (message.id !== 2) continue;
    if (message.error !== undefined) throw new Error(message.error.message);
    const text = (message.result?.content ?? []).map((part: { text?: string }) => part.text ?? "").join("\n");
    if (message.result?.isError === true) throw new Error(text);
    return text;
  }
  throw new Error("Sizewise didn't answer. Open Sizewise once, then try again.");
}

/** Starts the server, sends it `input`, and collects what it prints until it exits. */
export function runServer(path: string, input: string): Promise<ServerOutput> {
  return new Promise((resolve, reject) => {
    const server = spawn(path, [], { stdio: ["pipe", "pipe", "ignore"] });
    let stdout = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      server.kill();
    }, timeout);
    server.stdout.setEncoding("utf8");
    server.stdout.on("data", (chunk: string) => (stdout += chunk));
    server.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    server.on("close", () => {
      clearTimeout(timer);
      resolve({ stdout, timedOut });
    });
    server.stdin.end(input);
  });
}

/** Asks the server one question with `run` and returns its plain-text answer. */
export async function askServer(
  tool: string,
  args: Record<string, unknown>,
  run: (input: string) => Promise<ServerOutput>,
): Promise<string> {
  const defined = Object.fromEntries(Object.entries(args).filter(([, value]) => value !== undefined));
  return parseAnswer(await run(requestLines(tool, defined)));
}
