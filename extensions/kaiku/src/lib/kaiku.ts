import { Toast, getApplications, open, showHUD, showToast } from "@raycast/api";
import { spawn } from "child_process";
import { existsSync } from "fs";

const BUNDLE_ID = "com.gabrielepartiti.kaiku";
const RELEASES_URL = "https://github.com/gabry-ts/kaiku/releases/latest";

export class KaikuNotInstalledError extends Error {
  constructor() {
    super("Kaiku is not installed");
  }
}

async function appPath(): Promise<string | undefined> {
  const apps = await getApplications();
  const app = apps.find((a) => a.bundleId === BUNDLE_ID);
  if (app) return app.path;
  return existsSync("/Applications/Kaiku.app") ? "/Applications/Kaiku.app" : undefined;
}

/** Shows a toast with a link to the releases page. */
export async function showNotInstalled() {
  await showToast({
    style: Toast.Style.Failure,
    title: "Kaiku is not installed",
    message: "Download it from GitHub",
    primaryAction: { title: "Open Releases Page", onAction: () => open(RELEASES_URL) },
  });
}

/** Opens a kaiku:// URL. Returns false (after a toast) when Kaiku is missing. */
export async function openKaiku(url: string): Promise<boolean> {
  if (!(await appPath())) {
    await showNotInstalled();
    return false;
  }
  await open(url, BUNDLE_ID);
  return true;
}

/** Runs a recording control command and shows a short confirmation. */
export async function control(route: string, done: string) {
  if (await openKaiku(`kaiku://${route}`)) await showHUD(done);
}

type JsonRpcResponse = { id?: number; result?: unknown; error?: { message: string } };

/** Calls tools on the kaiku-mcp server bundled with the app, over stdio. */
export async function callTools(calls: { name: string; arguments: Record<string, unknown> }[]): Promise<string[]> {
  const app = await appPath();
  if (!app) throw new KaikuNotInstalledError();
  const server = `${app}/Contents/MacOS/kaiku-mcp`;
  if (!existsSync(server)) throw new Error("This version of Kaiku has no kaiku-mcp. Update the app.");

  return new Promise((resolve, reject) => {
    const child = spawn(server, [], { stdio: ["pipe", "pipe", "ignore"] });
    const pending = new Map<number, (r: JsonRpcResponse) => void>();
    let buffer = "";
    let finished = false;

    const finish = (error?: Error, texts?: string[]) => {
      if (finished) return;
      finished = true;
      child.kill();
      if (error) reject(error);
      else resolve(texts ?? []);
    };

    child.on("error", (e) => finish(e));
    child.on("exit", () => finish(new Error("kaiku-mcp stopped unexpectedly")));
    child.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      let i: number;
      while ((i = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, i).trim();
        buffer = buffer.slice(i + 1);
        if (!line) continue;
        try {
          const message = JSON.parse(line) as JsonRpcResponse;
          if (message.id !== undefined) pending.get(message.id)?.(message);
        } catch {
          // Not a JSON-RPC line; ignore it.
        }
      }
    });

    let nextId = 1;
    const request = (method: string, params: unknown) =>
      new Promise<JsonRpcResponse>((res) => {
        const id = nextId++;
        pending.set(id, res);
        child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
      });

    (async () => {
      const init = await request("initialize", {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "raycast-kaiku", version: "1.0.0" },
      });
      if (init.error) throw new Error(init.error.message);
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

      const texts: string[] = [];
      for (const call of calls) {
        const response = await request("tools/call", call);
        if (response.error) throw new Error(response.error.message);
        const result = response.result as { content?: { text?: string }[]; isError?: boolean };
        const text = (result.content ?? []).map((c) => c.text ?? "").join("\n");
        if (result.isError) throw new Error(text || "kaiku-mcp returned an error");
        texts.push(text);
      }
      finish(undefined, texts);
    })().catch((e) => finish(e instanceof Error ? e : new Error(String(e))));
  });
}
