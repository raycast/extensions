import fs from "node:fs";
import os from "node:os";
import { runAppleScript } from "@raycast/utils";
import { SystemHostFilePath } from "../const";

class HostsPermissionCancelledError extends Error {}

export function isSafeSystemHostsFile(stats: fs.Stats): boolean {
  return stats.isFile() && stats.uid === 0 && stats.gid === 0 && (stats.mode & 0o7777) === 0o644;
}

export function checkSysHostAccess(): boolean {
  try {
    // Writable legacy installations (0777) must also go through the repair flow.
    if (!isSafeSystemHostsFile(fs.lstatSync(SystemHostFilePath))) return false;
    fs.accessSync(SystemHostFilePath, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

async function requestSysHostAccess(): Promise<void> {
  // Resolve the requesting account before elevation; the privileged shell runs as root.
  const { username, uid } = os.userInfo();
  if (uid === 0) throw new Error("Run iHosts from your regular macOS account.");

  const result = await runAppleScript(
    `
on run argv
set hostsPath to item 1 of argv
set accountAccess to item 2 of argv
set permissionCommand to "/bin/test -f " & quoted form of hostsPath & " && /bin/test ! -L " & quoted form of hostsPath & " && /usr/sbin/chown root:wheel " & quoted form of hostsPath & " && /bin/chmod 0644 " & quoted form of hostsPath & " && /bin/chmod +a " & quoted form of accountAccess & " " & quoted form of hostsPath
try
  do shell script permissionCommand with administrator privileges with prompt "iHosts wants to enable hosts editing for your macOS account."
on error errorMessage number errorNumber
  if errorNumber is -128 then return "cancelled"
  error errorMessage number errorNumber
end try
return "granted"
end run
`,
    [SystemHostFilePath, `user:${username} allow read,write`],
    // The native authentication dialog must remain available while the user authorizes.
    { timeout: 0 }
  );

  if (result === "cancelled") throw new HostsPermissionCancelledError("Permission request canceled.");
  if (!checkSysHostAccess()) throw new Error("macOS did not grant safe write access to the hosts file.");
}

let permissionRequest: Promise<void> | undefined;

export function getSysHostAccess(): Promise<void> {
  if (checkSysHostAccess()) return Promise.resolve();
  // Repeated actions share one native authentication request within this command.
  if (!permissionRequest) {
    permissionRequest = requestSysHostAccess().finally(() => {
      permissionRequest = undefined;
    });
  }
  return permissionRequest;
}

export function getSysHostPermissionErrorMessage(error: unknown): string {
  return error instanceof HostsPermissionCancelledError
    ? "Permission request canceled. Choose Enable Hosts Access to try again."
    : "Could not enable hosts access. Try again and authorize with a macOS administrator account.";
}
