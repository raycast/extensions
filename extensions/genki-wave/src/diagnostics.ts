import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { bindingsPath } from "./bindings";
import { extensionFolder, helperPath } from "./helper";
import * as listener from "./listener";
import { statusPath } from "./status";

// Everything needed to tell why Wave doesn't work on someone else's Mac, as one
// paste. Nothing here touches the ring.

const run = promisify(execFile);

async function output(cmd: string, args: string[]): Promise<string> {
  try {
    const { stdout, stderr } = await run(cmd, args, { timeout: 15_000 });
    return (stdout + stderr).trim();
  } catch (e) {
    const { stdout = "", stderr = "", message } = e as { stdout?: string; stderr?: string; message: string };
    return (stdout + stderr).trim() || `(failed: ${message})`;
  }
}

function read(path: string, tail?: number): string {
  try {
    const text = readFileSync(path, "utf8").trimEnd();
    return tail ? text.split("\n").slice(-tail).join("\n") : text;
  } catch (e) {
    return `(${(e as Error).message})`;
  }
}

async function describeFile(path: string): Promise<string> {
  if (!existsSync(path)) return `${path}: missing`;
  const { mode, size, mtime } = statSync(path);
  const sha = createHash("sha256").update(readFileSync(path)).digest("hex").slice(0, 12);
  const signature = (await output("/usr/bin/codesign", ["-dv", path]))
    .split("\n")
    .filter((l) => /^(Identifier|TeamIdentifier|Authority)=/.test(l))
    .join("; ");
  return [
    `${path}`,
    `  mode ${(mode & 0o777).toString(8)}, ${size} bytes, sha256 ${sha}, modified ${mtime.toISOString()}`,
    `  archs: ${await output("/usr/bin/lipo", ["-archs", path])}`,
    `  signature: ${signature || "(none)"}`,
    `  verify: ${(await output("/usr/bin/codesign", ["--verify", "--strict", path])) || "ok"}`,
    `  xattrs: ${(await output("/usr/bin/xattr", [path])) || "none"}`,
  ].join("\n");
}

/** Bluetooth power and the Waves macOS knows about, from System Information. */
async function bluetooth(): Promise<string> {
  const raw = await output("/usr/sbin/system_profiler", ["SPBluetoothDataType", "-json"]);
  try {
    const data = JSON.parse(raw).SPBluetoothDataType?.[0] ?? {};
    const state = data.controller_properties?.controller_state ?? "unknown";
    const waves = (list: Record<string, unknown>[] | undefined) =>
      (list ?? []).flatMap((entry) => Object.keys(entry)).filter((name) => /wave/i.test(name));
    return [
      `controller: ${state}`,
      `connected Waves: ${waves(data.device_connected).join(", ") || "none"}`,
      `known, not connected: ${waves(data.device_not_connected).join(", ") || "none"}`,
    ].join("\n");
  } catch {
    return raw.slice(0, 500);
  }
}

export async function collectDiagnostics(): Promise<string> {
  // Which helper the extension would run, and why not if it can't (e.g. the download failed).
  let bundled: string;
  try {
    bundled = await helperPath();
  } catch (e) {
    bundled = `(${(e as Error).message})`;
  }
  const agent = await listener.agentStatus();
  const sections: [string, string | Promise<string>][] = [
    [
      "System",
      Promise.all([
        output("/usr/bin/sw_vers", ["-productVersion"]),
        output("/usr/bin/uname", ["-m"]),
        output("/usr/sbin/sysctl", ["-n", "sysctl.proc_translated"]),
      ]).then(
        ([macos, arch, rosetta]) =>
          `macOS ${macos}, ${arch}${rosetta === "1" ? " (Raycast under Rosetta)" : ""}, Raycast ${environment.raycastVersion}`,
      ),
    ],
    ["Extension's helper", describeFile(bundled)],
    ["Listener's copy", describeFile(listener.helperInstallPath())],
    [
      "Launch agent",
      agent
        ? `state ${agent.state}, pid ${agent.pid ?? "-"}, runs ${agent.runs ?? "-"}, last exit ${agent.lastExit ?? "-"}\nprogram ${agent.program ?? "-"}\nup to date: ${listener.agentIsCurrent(bundled, undefined, undefined, undefined, extensionFolder())}`
        : "not loaded",
    ],
    ["Bluetooth", bluetooth()],
    [
      "Other Wave apps running",
      Promise.all(
        ["Softwave", "Wave for Work"].map(async (app) => {
          const pids = await output("/usr/bin/pgrep", ["-x", app]);
          return /^\d/.test(pids) ? app : undefined;
        }),
      ).then((apps) => apps.filter(Boolean).join(", ") || "none"),
    ],
    ["buttons.json", read(bindingsPath())],
    ["status.json", read(statusPath())],
    [
      "listener.log (last 60 lines)",
      // The raw end of the file, earlier runs included: crashes and restarts show there.
      listener
        .readLastLines(listener.logPath(), 60)
        // Older helpers logged what was dictated; that doesn't belong in a pasted report.
        .replace(/"text":"(?:[^"\\]|\\.)*"/g, '"text":"…"')
        .trim() || "(empty)",
    ],
    ["Launch agent plist", read(join(homedir(), "Library", "LaunchAgents", `${listener.LABEL}.plist`), 30)],
  ];
  const bodies = await Promise.all(sections.map(([, body]) => body));
  return [
    `Genki Wave diagnostics, ${new Date().toISOString()}`,
    ...sections.map(([title], i) => `## ${title}\n${bodies[i]}`),
  ].join("\n\n");
}
