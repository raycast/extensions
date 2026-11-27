import { confirmAlert, showHUD } from "@raycast/api";
import { execFileSync } from "node:child_process";
import { platform } from "node:os";
import { getMacOSCommandsForVersion } from "./macOSCommands";
import { runWithPrivileges, type PrivilegedCommand } from "./sudoSupport";
import { flushWindowsDns } from "./windowsSupport";

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
      console.log("🚀 Executing DNS flush command: ipconfig /flushdns");
      await flushWindowsDns();
    }

    await showHUD("✅ DNS Cache Flushed Successfully");
  } catch (error) {
    await handleExecutionError(error);
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

async function handleExecutionError(error: unknown) {
  console.error("💥 Execution failed:", error);
  await showHUD(`⚠️ ${getErrorSummary(error)}`.substring(0, 64));
}

function getErrorSummary(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return "Error flushing DNS cache";
  }

  const lines = (output: unknown) =>
    String(output ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

  // Command-line tools such as ipconfig print their errors on stdout, after a header.
  const stderrLines = "stderr" in error ? lines(error.stderr) : [];
  const stdoutLines = "stdout" in error ? lines(error.stdout) : [];

  return (
    stderrLines[0] ??
    stdoutLines[stdoutLines.length - 1] ??
    ("message" in error && typeof error.message === "string" ? error.message : "Error flushing DNS cache")
  );
}
