import { confirmAlert, showHUD } from "@raycast/api";
import { execFileSync, execSync } from "node:child_process";
import { platform } from "node:os";
import { getMacOSCommandsForVersion } from "./macOSCommands";
import { runWithPrivileges, type PrivilegedCommand } from "./sudoSupport";

const WINDOWS_COMMAND = "ipconfig /flushdns";

export default async function main() {
  const osPlatform = platform();

  if (!["darwin", "win32"].includes(osPlatform)) {
    await showHUD("🚫 Unsupported operating system");
    return;
  }

  try {
    if (osPlatform === "darwin") {
      const commands = await getMacOSCommands();
      if (!commands) return;

      const commandSummary = commands.map((command) => [command.executable, ...command.args].join(" ")).join("; ");
      console.log(`🚀 Executing privileged DNS flush commands: ${commandSummary}`);
      await runWithPrivileges(commands);
    } else {
      console.log(`🚀 Executing DNS flush command: ${WINDOWS_COMMAND}`);
      execSync(WINDOWS_COMMAND, { stdio: "ignore" });
    }

    await showHUD("✅ DNS Cache Flushed Successfully");
  } catch (error) {
    await handleExecutionError(error, osPlatform);
  }
}

async function getMacOSCommands(): Promise<readonly PrivilegedCommand[] | null> {
  try {
    const osVersion = execFileSync("/usr/bin/sw_vers", ["-productVersion"]).toString().trim();
    const commands = getMacOSCommandsForVersion(osVersion);

    if (commands) {
      return commands;
    }

    const confirmed = await confirmAlert({
      title: `⚠️ OS Version ${osVersion} Not Tested`,
      message: "Attempt to flush DNS cache anyway?",
      primaryAction: { title: "Flush DNS" },
    });

    if (!confirmed) return null;

    const fallbackCommands = getMacOSCommandsForVersion("11");
    if (!fallbackCommands) {
      throw new Error("Unable to select modern macOS DNS flush commands");
    }

    return fallbackCommands;
  } catch (error) {
    console.error("❌ Error determining macOS version:", error);
    await showHUD("Failed to determine macOS version");
    return null;
  }
}

async function handleExecutionError(error: unknown, os: string) {
  let errorMessage = "⚠️ Error flushing DNS cache";

  if (typeof error === "object" && error !== null && "stderr" in error) {
    const stderr = (error as { stderr?: Buffer | string }).stderr?.toString() || "";
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
