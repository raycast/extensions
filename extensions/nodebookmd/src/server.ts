import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

// NodebookMD takes the first free port at or above 48800.
const FIRST_PORT = 48800;
const PORT_TRIES = 10;

async function answers(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/index_status`, { signal: AbortSignal.timeout(400) });
    return response.ok;
  } catch {
    return false;
  }
}

async function findRunningServer(): Promise<string | undefined> {
  for (let port = FIRST_PORT; port < FIRST_PORT + PORT_TRIES; port++) {
    const baseUrl = `http://127.0.0.1:${port}`;
    if (await answers(baseUrl)) return baseUrl;
  }
  return undefined;
}

/** Starts the app. On macOS it stays in the background; Windows has no such switch. */
function startApp() {
  if (process.platform === "win32") {
    const program = join(process.env.LOCALAPPDATA ?? "", "NodebookMD", "nodebookmd.exe");
    if (existsSync(program)) spawn(program, [], { detached: true, stdio: "ignore" }).unref();
    return;
  }
  execFile("open", ["-ga", "NodebookMD"]);
}

/** The address of the NodebookMD server. Starts the app when it is not running. */
export async function nodebookServer(): Promise<string> {
  const running = await findRunningServer();
  if (running) return running;
  startApp();
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const started = await findRunningServer();
    if (started) return started;
  }
  throw new Error("NodebookMD did not start. Get it from nodebook.md.");
}
