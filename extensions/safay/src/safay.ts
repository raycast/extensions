// Talks to Safay through its AppleScript commands (Safay.sdef), the only channel: macOS Automation decides which apps
// may, and Safay itself asks for Touch ID or the master password before every copy. Nothing here sees a code or a
// secret, keeps the account list, or uses the network.
import { getApplications } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { execFile } from "node:child_process";
import { BRIDGE } from "./generated";

export { TEXT } from "./generated";

export interface Account {
  id: string;
  issuer: string;
  /** Masked by Safay. */
  username: string;
}

export type Found =
  | { kind: "accounts"; accounts: Account[] }
  | { kind: "disabled" }
  | { kind: "notReady" }
  | { kind: "notRunning" }
  | { kind: "notInstalled" }
  | { kind: "permission" }
  | { kind: "error" };

/** What `copy code` answered (Safay.sdef); the code itself never comes back. */
export type CopyStatus =
  | "copied"
  | "pending"
  | "cancelled"
  | "failed"
  | "busy"
  | "not_found"
  | "disabled"
  | "not_ready"
  | "not_running"
  | "permission";

const BUNDLE_IDS = ["com.gicek.safay", "com.gicek.safay.debug"];

/** The bridge script with its arguments as argv, never put into the script's text. */
async function bridge(command: "find" | "copy", argument: string, timeout: number): Promise<string> {
  try {
    return (await runAppleScript(BRIDGE, [command, argument], { timeout })).trim();
  } catch (error) {
    // -1743: the user has not allowed this app to control Safay (macOS Automation).
    const detail = `${(error as { stderr?: string }).stderr ?? ""} ${(error as Error).message ?? ""}`;
    throw detail.includes("-1743") ? new Error("permission") : error;
  }
}

export async function findAccounts(query: string): Promise<Found> {
  let output: string;
  try {
    output = await bridge("find", query, 10_000);
  } catch (error) {
    return { kind: (error as Error).message === "permission" ? "permission" : "error" };
  }
  if (output === "not_running") return { kind: (await isInstalled()) ? "notRunning" : "notInstalled" };
  try {
    const found = JSON.parse(output) as { enabled: boolean; ready: boolean; accounts: Account[] };
    if (!found.enabled) return { kind: "disabled" };
    if (!found.ready) return { kind: "notReady" };
    return { kind: "accounts", accounts: found.accounts };
  } catch {
    return { kind: "error" };
  }
}

/** Safay asks the user, copies the code and shows its own notice; Touch ID can take a while. */
export async function copyCode(id: string): Promise<CopyStatus> {
  try {
    return (await bridge("copy", id, 300_000)) as CopyStatus;
  } catch (error) {
    return (error as Error).message === "permission" ? "permission" : "failed";
  }
}

export const DOWNLOAD_URL = "https://github.com/gicek/safay/releases/latest";

async function isInstalled(): Promise<boolean> {
  const apps = await getApplications();
  return apps.some((app) => app.bundleId !== undefined && BUNDLE_IDS.includes(app.bundleId));
}

function run(file: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => execFile(file, args, (error) => (error ? reject(error) : resolve())));
}

/** Opens Safay (the release build when both are installed) without sending it an Apple event. */
export async function openSafay(): Promise<void> {
  try {
    await run("/usr/bin/open", ["-b", BUNDLE_IDS[0]]);
  } catch {
    await run("/usr/bin/open", ["-b", BUNDLE_IDS[1]]);
  }
}

export function openAutomationSettings(): Promise<void> {
  return run("/usr/bin/open", ["x-apple.systempreferences:com.apple.preference.security?Privacy_Automation"]);
}
