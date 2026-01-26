import { exec } from "child_process";
import { promisify } from "util";
import { SetupStatus } from "../types/transcription";
import { getEnhancedEnv } from "./env-path";

const execAsync = promisify(exec);

export class SetupChecker {
  /**
   * Check if a command is available in PATH
   */
  static async checkCommand(command: string): Promise<boolean> {
    try {
      await execAsync(`which ${command}`, { env: getEnhancedEnv() });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get version of a command
   */
  static async getCommandVersion(
    command: string,
    versionFlag = "--version",
  ): Promise<string | null> {
    try {
      const { stdout } = await execAsync(`${command} ${versionFlag} 2>&1`, {
        env: getEnhancedEnv(),
      });
      return stdout.trim().split("\n")[0];
    } catch {
      return null;
    }
  }

  /**
   * Check all required dependencies
   */
  static async checkAll(): Promise<SetupStatus> {
    const [
      parakeetInstalled,
      soxInstalled,
      ffmpegInstalled,
      pythonVersion,
      parakeetVersion,
    ] = await Promise.all([
      this.checkCommand("parakeet-mlx"),
      this.checkCommand("sox"),
      this.checkCommand("ffmpeg"),
      this.getCommandVersion("python3"),
      this.getCommandVersion("parakeet-mlx"),
    ]);

    // Microphone access check is implicit - will fail on first recording if denied
    const microphoneAccess = true;

    const audioToolAvailable = soxInstalled || ffmpegInstalled;
    const allReady =
      parakeetInstalled && audioToolAvailable && pythonVersion !== null;

    return {
      parakeetInstalled,
      parakeetVersion,
      soxInstalled,
      ffmpegInstalled,
      pythonVersion,
      microphoneAccess,
      allReady,
    };
  }

  /**
   * Get installation instructions based on missing dependencies
   */
  static getInstallInstructions(status: SetupStatus): string[] {
    const instructions: string[] = [];

    if (!status.pythonVersion) {
      instructions.push("**Install Python 3.8+**");
      instructions.push("```bash");
      instructions.push("brew install python3");
      instructions.push("```");
      instructions.push("");
    }

    if (!status.parakeetInstalled) {
      instructions.push("**Install Parakeet MLX**");
      instructions.push("```bash");
      instructions.push("# Install pipx if not already installed");
      instructions.push("brew install pipx");
      instructions.push("");
      instructions.push("# Install parakeet-mlx using pipx");
      instructions.push("pipx install parakeet-mlx");
      instructions.push("```");
      instructions.push("");
    }

    if (!status.soxInstalled && !status.ffmpegInstalled) {
      instructions.push("**Install Audio Recording Tool (choose one)**");
      instructions.push("");
      instructions.push("*Option A: SoX (Recommended)*");
      instructions.push("```bash");
      instructions.push("brew install sox");
      instructions.push("```");
      instructions.push("");
      instructions.push("*Option B: FFmpeg*");
      instructions.push("```bash");
      instructions.push("brew install ffmpeg");
      instructions.push("```");
      instructions.push("");
    }

    if (instructions.length === 0) {
      instructions.push("✓ All dependencies are installed and ready!");
    } else {
      instructions.unshift(
        "# Installation Required",
        "",
        "Please install the following dependencies:",
        "",
      );
    }

    return instructions;
  }

  /**
   * Format status for display
   */
  static formatStatus(status: SetupStatus): string {
    const lines: string[] = [];

    lines.push("# Dependency Status", "");

    lines.push(
      `${status.pythonVersion ? "✓" : "✗"} **Python**: ${status.pythonVersion || "Not found"}`,
    );
    lines.push(
      `${status.parakeetInstalled ? "✓" : "✗"} **Parakeet MLX**: ${status.parakeetVersion || "Not installed"}`,
    );
    lines.push(
      `${status.soxInstalled ? "✓" : "✗"} **SoX**: ${status.soxInstalled ? "Installed" : "Not found"}`,
    );
    lines.push(
      `${status.ffmpegInstalled ? "✓" : "✗"} **FFmpeg**: ${status.ffmpegInstalled ? "Installed" : "Not found"}`,
    );

    lines.push("");

    // Add debug info about PATH
    const enhancedPath = getEnhancedEnv().PATH || "";
    const pathDirs = enhancedPath.split(":").filter((p) => p);
    lines.push("## Debug Info");
    lines.push("");
    lines.push("**Search Paths:**");
    pathDirs.forEach((dir) => {
      if (
        dir.includes("homebrew") ||
        dir.includes(".local") ||
        dir === "/usr/local/bin"
      ) {
        lines.push(`- \`${dir}\``);
      }
    });
    lines.push("");

    if (!status.soxInstalled && !status.ffmpegInstalled) {
      lines.push("⚠️ **At least one audio tool (SoX or FFmpeg) is required**");
      lines.push("");
    }

    if (status.allReady) {
      lines.push("✅ **Ready to use!** All dependencies are installed.");
    } else {
      lines.push(
        "❌ **Setup incomplete** - Please install missing dependencies below.",
      );
    }

    return lines.join("\n");
  }
}
