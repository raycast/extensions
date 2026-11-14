import fs from "node:fs";
import os from "node:os";
import { runAppleScript } from "run-applescript";
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

function appleScriptString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n")}"`;
}

async function requestSysHostAccess(): Promise<void> {
  // Resolve the requesting account before elevation; the privileged shell runs as root.
  const { username, uid } = os.userInfo();
  if (uid === 0) throw new Error("Run iHosts from your regular macOS account.");

  const result = await runAppleScript(`
set hostsPath to ${appleScriptString(SystemHostFilePath)}
set accountAccess to ${appleScriptString(`user:${username} allow read,write`)}
set permissionCommand to "/bin/test -f " & quoted form of hostsPath & " && /bin/test ! -L " & quoted form of hostsPath & " && /usr/sbin/chown root:wheel " & quoted form of hostsPath & " && /bin/chmod 0644 " & quoted form of hostsPath & " && /bin/chmod +a " & quoted form of accountAccess & " " & quoted form of hostsPath
try
  do shell script permissionCommand with administrator privileges with prompt "iHosts wants to enable hosts editing for your macOS account."
on error errorMessage number errorNumber
  if errorNumber is -128 then return "cancelled"
  error errorMessage number errorNumber
end try
return "granted"
`);

  if (result === "cancelled") throw new HostsPermissionCancelledError("Permission request cancelled.");
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
    ? "Permission request cancelled. Choose Enable Hosts Access to try again."
    : "Could not enable hosts access. Try again and authorize with a macOS administrator account.";
}
