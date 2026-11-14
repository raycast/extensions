import { createHash } from "node:crypto";
import { Deps, RunResult } from "./deps";

// On macOS Claude Code keeps its login in a generic-password Keychain item instead of the credentials file. The tool is
// referenced by absolute path, because Raycast runs with a minimal PATH.
const SECURITY = "/usr/bin/security";
const DEFAULT_SERVICE = "Claude Code-credentials";
// `security` exits with 44 (errSecItemNotFound) when no item has the service name.
const ITEM_NOT_FOUND = 44;
// macOS can show an "allow access" dialog before it answers, and the user may take a while to click, so this waits
// longer than the default timeout.
const READ_TIMEOUT_MS = 60_000;

export type KeychainRead =
  // The item's password as text.
  | { kind: "found"; text: string }
  // No item has this service name.
  | { kind: "missing" }
  // The user clicked Deny or Cancel, or the Keychain is locked or can't be read.
  | { kind: "denied" }
  // Not macOS, so there is no Keychain to read.
  | { kind: "unsupported" };

// The name of the Keychain item Claude Code uses for its config folder. Only an unset or empty CLAUDE_CONFIG_DIR keeps
// the plain name. Any other value, even the default folder, gets a suffix from a short hash of the value as it was
// given. The folder is not resolved or trimmed first, since Claude Code hashes the raw value. The hash is taken of the
// NFC form, which is what Claude Code hashes, so a path with decomposed characters finds the same item.
export function claudeKeychainService(configDir: string | undefined): string {
  if (!configDir) {
    return DEFAULT_SERVICE;
  }
  const hash = createHash("sha256").update(configDir.normalize("NFC")).digest("hex").slice(0, 8);
  return `${DEFAULT_SERVICE}-${hash}`;
}

export type KeychainItemDate =
  // The modified date as security prints it, such as "20261014120000Z\000". It changes whenever the item is written.
  | { kind: "found"; modified: string }
  // No item has this service name.
  | { kind: "missing" }
  // Not macOS, so there is no Keychain to read.
  | { kind: "unsupported" }
  // security failed for another reason, or printed no modified date.
  | { kind: "error" };

// The line of `security find-generic-password` output that holds the modified date. The date is in quotes after its hex
// value, and the hex is used when there are no quotes.
const MODIFIED_LINE = /"mdat"<timedate>=0x([0-9A-Fa-f]+)(?:[ \t]+"([^"]*)")?/;

// Reads when a generic-password item was last written, from its attributes only. Without -w, macOS answers without the
// access dialog, so this can run as often as needed. Claude Code writes its login again each time it changes it, so a new
// date means a new login.
export async function readKeychainItemDate(deps: Deps, service: string): Promise<KeychainItemDate> {
  if (deps.platform !== "darwin") {
    return { kind: "unsupported" };
  }

  let result: RunResult;
  try {
    result = await deps.run(SECURITY, ["find-generic-password", "-s", service]);
  } catch {
    return { kind: "error" };
  }
  if (result.exitCode === ITEM_NOT_FOUND) {
    return { kind: "missing" };
  }
  const match = result.exitCode === 0 ? MODIFIED_LINE.exec(result.stdout) : null;
  if (!match) {
    return { kind: "error" };
  }
  return { kind: "found", modified: match[2] || match[1] };
}

// Reads the password of a generic-password item. Only exit code 0 and 44 are answers about the item. Any other exit code
// is a refused or cancelled access dialog, so it counts as denied.
export async function readKeychainPassword(deps: Deps, service: string): Promise<KeychainRead> {
  if (deps.platform !== "darwin") {
    return { kind: "unsupported" };
  }

  let result: RunResult;
  try {
    result = await deps.run(SECURITY, ["find-generic-password", "-s", service, "-w"], { timeoutMs: READ_TIMEOUT_MS });
  } catch {
    // The tool couldn't start, or it ran past the timeout, which is what an unanswered dialog looks like.
    return { kind: "denied" };
  }
  if (result.exitCode === 0) {
    return { kind: "found", text: decodePassword(result.stdout.trim()) };
  }
  if (result.exitCode === ITEM_NOT_FOUND) {
    return { kind: "missing" };
  }
  return { kind: "denied" };
}

// `security -w` prints the password as hex when it has newlines or other non-printable characters. Hex is decoded only
// when the result is the credentials JSON, so any other text that happens to be hex is returned unchanged.
function decodePassword(output: string): string {
  if (output.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(output)) {
    return output;
  }
  const decoded = Buffer.from(output, "hex").toString("utf8");
  return decoded.startsWith("{") ? decoded : output;
}
