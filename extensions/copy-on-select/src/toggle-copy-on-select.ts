import { showHUD, environment } from "@raycast/api";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { connect } from "node:net";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const SUPPORT_DIR = join(
  homedir(),
  "Library",
  "Application Support",
  "CopyOnSelect",
);
const SOCKET = join(SUPPORT_DIR, "control.sock");
// The daemon runs from a fixed path outside the extension directory. macOS keys privacy
// permissions to the binary path, and the extension directory changes on every update.
const DAEMON = join(SUPPORT_DIR, "copyonselectd");

type Reply = {
  ok: boolean;
  enabled?: boolean;
  error?: string;
  message?: string;
};

const sha256 = (path: string) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

/** Copies the bundled daemon to its fixed path, after verifying the committed checksum. */
function install() {
  const asset = join(environment.assetsPath, "copyonselectd");
  const expected = readFileSync(
    join(environment.assetsPath, "copyonselectd.sha256"),
    "utf8",
  )
    .trim()
    .split(/\s+/)[0];
  if (sha256(asset) !== expected)
    throw new Error("The bundled binary failed its integrity check.");
  if (existsSync(DAEMON) && sha256(DAEMON) === expected) return;
  mkdirSync(SUPPORT_DIR, { recursive: true });
  copyFileSync(asset, DAEMON);
  chmodSync(DAEMON, 0o755);
}

/** Sends one newline-terminated request and resolves the single reply. */
function request(cmd: string, timeout = 2000): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const socket = connect(SOCKET);
    socket.setTimeout(timeout);
    socket.on("connect", () => socket.write(JSON.stringify({ cmd }) + "\n"));
    socket.on("data", (data) => {
      socket.destroy();
      try {
        resolve(JSON.parse(data.toString()) as Reply);
      } catch {
        reject(new Error("The background process sent an invalid response."));
      }
    });
    socket.on(
      "timeout",
      () => (
        socket.destroy(),
        reject(new Error("The background process did not respond."))
      ),
    );
    socket.on("error", reject);
  });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Starts the daemon detached and waits for it to answer. */
async function launch() {
  spawn(DAEMON, [], { detached: true, stdio: "ignore" }).unref();
  for (let i = 0; i < 15; i++) {
    await wait(200);
    try {
      return await request("status", 500);
    } catch {
      /* not listening yet */
    }
  }
  throw new Error("The background process did not start.");
}

export default async function main() {
  try {
    install();
    try {
      await request("status", 500);
    } catch {
      await launch();
    }
    const reply = await request("toggle");
    if (reply.ok)
      return showHUD(`Copy on Select: ${reply.enabled ? "On" : "Off"}`);
    if (reply.error === "permissions")
      return showHUD(`Setup Required — ${reply.message}`);
    return showHUD(
      `Copy on Select failed — ${reply.message ?? "unknown error"}`,
    );
  } catch (error) {
    return showHUD(
      `Copy on Select failed — ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
