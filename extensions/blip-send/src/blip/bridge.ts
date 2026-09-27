import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { assetPath, isWindows, powershell, socketPath } from "../platform";
import { BlipTimeoutError, BlipUnavailableError } from "./errors";

/**
 * Where to connect to reach Blip's core.
 *
 * On the Mac that is Blip's own Unix socket. Node cannot open an AF_UNIX socket on
 * Windows, where net.connect() reads the path as a named pipe and fails with EACCES, so
 * there a PowerShell bridge accepts a named pipe and relays it to the socket. One bridge
 * serves every call for the life of the command and exits once this process stops
 * writing to its stdin.
 */

const BRIDGE_ASSET = "blip-bridge.ps1";
const START_TIMEOUT_MS = 20_000;

interface Bridge {
  pipe: string;
  ready: Promise<string>;
}

let current: Bridge | undefined;

/** The address to hand to net.connect for one RPC. */
export async function endpoint(): Promise<string> {
  if (!isWindows) return socketPath;
  const bridge = (current ??= start());
  try {
    return await bridge.ready;
  } catch (error) {
    // Let the next call start a fresh bridge, for example once Blip has been opened.
    forget(bridge.pipe);
    throw error;
  }
}

/** Drops a bridge only while it is still the one in use, so a replacement is never lost. */
function forget(pipe: string) {
  if (current?.pipe === pipe) current = undefined;
}

function start(): Bridge {
  const pipe = `blip-raycast-${randomUUID()}`;
  const ready = new Promise<string>((resolve, reject) => {
    const child = spawn(
      powershell(),
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        assetPath(BRIDGE_ASSET),
        "-PipeName",
        pipe,
        "-SocketPath",
        socketPath,
      ],
      { stdio: ["pipe", "pipe", "pipe"], windowsHide: true },
    );

    let settled = false;
    let announced = "";
    let problem = "";

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      reject(error);
    };

    const timer = setTimeout(
      () => fail(new BlipTimeoutError("The Blip bridge did not start in time")),
      START_TIMEOUT_MS,
    );

    child.stdout.on("data", (chunk: Buffer) => {
      announced += chunk.toString();
      if (settled || !announced.includes("ready")) return;
      settled = true;
      clearTimeout(timer);
      resolve(`\\\\.\\pipe\\${pipe}`);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      problem += chunk.toString();
    });
    child.once("error", () => fail(new BlipUnavailableError("Could not start Windows PowerShell")));
    child.once("exit", () => {
      // Exiting before "ready" means the bridge could not reach Blip's socket.
      fail(new BlipUnavailableError(problem.trim() || "Blip is not running"));
      forget(pipe);
    });
  });
  return { pipe, ready };
}
