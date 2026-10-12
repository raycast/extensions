import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { promisify } from "node:util";

const execute = promisify(execFile);
export type LauncherOwner = {
  pid: number;
  started: string;
  executable: string;
  host: "Tinycast" | "Raycast";
  extension_path: string;
  extension_marker: string;
};

// Read the actual native child's parent, including in hosts with a process shim.
// The fixed shell expression reads one PID; no user text is interpreted by it.
export async function readLauncherOwner(
  assets: string,
): Promise<LauncherOwner> {
  const folder = dirname(await realpath(assets));
  const content = await readFile(join(folder, "package.json"));
  if (JSON.parse(content.toString()).name !== "semantic-search")
    throw new Error("Invalid extension identity");
  // Tinycast's fs shim does not expose dev/ino. Read the native identity in
  // both launchers so the server can detect uninstall/reinstall consistently.
  const { stdout: identity } = await execute(
    "/usr/bin/stat",
    ["-f", "%d:%i", folder],
    { timeout: 1000 },
  );
  if (!/^\d+:\d+$/.test(identity.trim()))
    throw new Error("Invalid extension identity");
  const marker = `${identity.trim()}:${createHash("sha256").update(content).digest("hex")}`;
  const { stdout: parent } = await execute(
    "/bin/sh",
    ["-c", 'printf "%s" "$PPID"'],
    { timeout: 1000 },
  );
  let pid = Number(parent);
  const deadline = Date.now() + 5000;
  for (let depth = 0; depth < 20 && Date.now() < deadline; depth++) {
    if (!Number.isSafeInteger(pid) || pid <= 1) break;
    const { stdout } = await execute(
      "/bin/ps",
      ["-p", String(pid), "-o", "pid=,ppid=,lstart=,comm="],
      {
        timeout: 1000,
        maxBuffer: 32 * 1024,
        env: { ...process.env, LC_ALL: "C", TZ: "UTC" },
      },
    );
    const fields = stdout
      .trim()
      .match(/^(\d+)\s+(\d+)\s+(\S+\s+\S+\s+\S+\s+\S+\s+\S+)\s+(.+)$/s);
    if (!fields) break;
    const executable = fields[4];
    const host = basename(executable);
    if (
      ["Tinycast", "Raycast"].includes(host) &&
      basename(dirname(executable)) === "MacOS"
    ) {
      const { stdout: bundle } = await execute(
        "/usr/libexec/PlistBuddy",
        [
          "-c",
          "Print :CFBundleIdentifier",
          join(dirname(dirname(executable)), "Info.plist"),
        ],
        { timeout: 1000 },
      );
      const expected =
        host === "Tinycast" ? "com.tinycast.app" : "com.raycast.macos";
      if (bundle.trim() === expected)
        return {
          pid: Number(fields[1]),
          started: fields[3].trim().split(/\s+/).join(" "),
          executable,
          host: host as LauncherOwner["host"],
          extension_path: folder,
          extension_marker: marker,
        };
    }
    const next = Number(fields[2]);
    if (next === pid) break;
    pid = next;
  }
  throw new Error("Run this command from Tinycast or Raycast");
}
