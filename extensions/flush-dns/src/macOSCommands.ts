import type { PrivilegedCommand } from "./sudoSupport";

const MACOS_COMMANDS = {
  dscacheutil: { executable: "/usr/bin/dscacheutil", args: ["-flushcache"] },
  mDNSResponder: { executable: "/usr/bin/killall", args: ["-HUP", "mDNSResponder"] },
  mdnsflushcache: { executable: "/usr/bin/discoveryutil", args: ["mdnsflushcache"] },
} as const satisfies Record<string, PrivilegedCommand>;

export function getMacOSCommandsForVersion(osVersion: string): readonly PrivilegedCommand[] | null {
  const [major] = osVersion.split(".").map(Number);

  if (Number.isNaN(major)) {
    throw new Error(`Unparsable macOS version: ${osVersion}`);
  }

  if (major >= 11) {
    return [MACOS_COMMANDS.dscacheutil, MACOS_COMMANDS.mDNSResponder];
  }

  if (major === 10) {
    const minor = Number(osVersion.split(".")[1]);

    if (minor >= 10) {
      return [MACOS_COMMANDS.mDNSResponder];
    }

    if (minor === 6) {
      return [MACOS_COMMANDS.dscacheutil];
    }

    return [MACOS_COMMANDS.mdnsflushcache];
  }

  return null;
}
