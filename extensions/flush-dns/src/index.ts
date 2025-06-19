import { confirmAlert, showHUD } from "@raycast/api";
import { execSync } from "node:child_process";
import { platform } from "node:os";

type ShellType = string | undefined;

interface CommandSet {
  commands: Record<string, string>;
  shell: ShellType;
}

const OS_COMMANDS = {
  darwin: {
    commands: {
      dscacheutil: "/usr/bin/dscacheutil -flushcache",
      mDNSResponder: "/usr/bin/killall -HUP mDNSResponder",
      mdnsflushcache: "/usr/bin/discoveryutil mdnsflushcache",
    },
    shell: "/bin/bash",
  },
  win32: {
    commands: {
      ipconfig: "ipconfig /flushdns",
    },
    shell: undefined, // Uses cmd.exe by default
  },
} as const satisfies Record<string, CommandSet>;

type SupportedPlatform = "darwin" | "win32";

interface Win32Commands {
  ipconfig: string;
}

export default async function main() {
  const osPlatform = platform();

  if (!["darwin", "win32"].includes(osPlatform)) {
    await showHUD("🚫 Unsupported operating system");
    return;
  }

  const osCommandSet = OS_COMMANDS[osPlatform as SupportedPlatform];

  let command: string;
  let shell: ShellType;

  switch (osPlatform) {
    case "darwin": {
      const macResult = await getMacOSCommands(osCommandSet);
      if (!macResult) return;

      command = macResult.command;
      shell = macResult.shell;
      break;
    }

    case "win32": {
      const { ipconfig } = osCommandSet.commands as Win32Commands;
      command = ipconfig;
      shell = osCommandSet.shell;
      break;
    }

    default:
      await showHUD("🚫 Unsupported OS");
      return;
  }

  console.log(`🚀 Executing DNS flush command: ${command} in shell: ${shell}`);

  try {
    execSync(command, { shell, stdio: "ignore" });
    await showHUD("✅ DNS Cache Flushed Successfully");
  } catch (error) {
    await handleExecutionError(error, osPlatform);
  }
}

async function getMacOSCommands(osCommandSet: CommandSet): Promise<{ command: string; shell: ShellType } | null> {
  try {
    const osVersion = execSync("sw_vers -productVersion").toString().trim();

    const versionPatterns: Record<string, string[]> = {
      "^1[1-5]": ["dscacheutil", "mDNSResponder"],
      "^10\\.([7-9]|1[1-4])|^10\\.10\\.[4-5]": ["mDNSResponder"],
      "^10\\.10\\.[0-3]": ["mdnsflushcache"],
      "^10\\.6": ["dscacheutil"],
    };

    let matched = false;
    let runCommands: string[] = [];

    for (const [pattern, cmds] of Object.entries(versionPatterns)) {
      if (new RegExp(pattern).test(osVersion)) {
        runCommands = cmds;
        matched = true;
        break;
      }
    }

    if (!matched) {
      const confirmed = await confirmAlert({
        title: `⚠️ OS Version ${osVersion} Not Tested`,
        message: "Attempt to flush DNS cache anyway?",
        primaryAction: { title: "Flush DNS" },
      });

      if (!confirmed) return null;
      runCommands = ["dscacheutil", "mDNSResponder"];
    }

    const commandList = runCommands.map((key) => osCommandSet.commands[key]).join("; ");
    return {
      command: `osascript -e 'do shell script "${commandList}" with administrator privileges'`,
      shell: osCommandSet.shell,
    };
  } catch (e) {
    console.error("❌ Error determining macOS version:", e);
    await showHUD("Failed to determine macOS version");
    return null;
  }
}

async function handleExecutionError(error: unknown, os: string) {
  let errorMessage = "⚠️ Error flushing DNS cache";

  if (typeof error === "object" && error !== null && "stderr" in error) {
    const stderr = (error as { stderr?: Buffer }).stderr?.toString() || "";
    if (stderr) {
      console.error(".Stderr:", stderr);
      if (os === "win32" && stderr.includes("The requested operation requires elevation")) {
        errorMessage = "⚠️ Run Raycast as Administrator";
      } else {
        errorMessage = stderr.split("\n")[0].substring(0, 64);
      }
    }
  }

  console.error("💥 Execution failed:", error);
  await showHUD(errorMessage);
}
