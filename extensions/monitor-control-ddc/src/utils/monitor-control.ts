import { showHUD, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";

// Detect if running on Apple Silicon
const isAppleSilicon = process.arch === "arm64";
const ddcCommandName = isAppleSilicon ? "m1ddc" : "ddcctl";

let ddcCommandPath: string | null = null;

export interface MonitorSettings {
  brightness?: number;
  eyeCareMode?: boolean;
}

export class MonitorControl {
  private static currentBrightness = 75; // Default brightness level

  private static async getDDCCommand(): Promise<string> {
    if (ddcCommandPath) return ddcCommandPath;

    const possiblePaths = [
      ddcCommandName, // Default PATH
      `/opt/homebrew/bin/${ddcCommandName}`, // Apple Silicon Homebrew
      `/usr/local/bin/${ddcCommandName}`, // Intel Homebrew
      `/usr/bin/${ddcCommandName}`, // System
    ];

    for (const path of possiblePaths) {
      try {
        // For paths with spaces or special characters, we need to handle them properly
        const command = path.includes(" ") ? `"${path}"` : path;
        execSync(`${command} --help`, { stdio: "ignore" });
        ddcCommandPath = path;
        return path;
      } catch {
        // Continue to next path
      }
    }

    throw new Error(`${ddcCommandName} not found in any expected location`);
  }

  static async setBrightness(level: number): Promise<void> {
    try {
      const ddcCommand = await this.getDDCCommand();

      // Clamp brightness between 0 and 100
      const brightness = Math.max(0, Math.min(100, level));

      const args = isAppleSilicon
        ? ["set", "luminance", brightness.toString()]
        : ["-d", "1", "-b", brightness.toString()];

      execSync(`${ddcCommand} ${args.join(" ")}`);
      this.currentBrightness = brightness;
      await showHUD(`✨ Brightness: ${brightness}%`);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Brightness Control Failed",
        message: `Make sure ${ddcCommandName} is installed (brew install ${ddcCommandName})`,
      });
      throw error;
    }
  }

  static async increaseBrightness(step = 10): Promise<void> {
    const current = await this.getCurrentBrightness();
    await this.setBrightness(current + step);
  }

  static async decreaseBrightness(step = 10): Promise<void> {
    const current = await this.getCurrentBrightness();
    await this.setBrightness(current - step);
  }

  static async getCurrentBrightness(): Promise<number> {
    try {
      const ddcCommand = await this.getDDCCommand();
      const args = isAppleSilicon ? ["get", "luminance"] : ["-d", "1", "-b", "?"];

      const output = execSync(`${ddcCommand} ${args.join(" ")}`, { encoding: "utf-8" });

      // Parse brightness from output
      const brightness = isAppleSilicon
        ? parseInt(output.trim()) // m1ddc returns just the number
        : parseInt(output.match(/brightness: (\d+)/)?.[1] || "75");

      this.currentBrightness = brightness;
      return brightness;
    } catch {
      // Fallback to stored value if can't read from monitor
      return this.currentBrightness;
    }
  }

  static async setContrast(level: number): Promise<void> {
    try {
      const ddcCommand = await this.getDDCCommand();

      // Clamp contrast between 0 and 100
      const contrast = Math.max(0, Math.min(100, level));

      const args = isAppleSilicon ? ["set", "contrast", contrast.toString()] : ["-d", "1", "-c", contrast.toString()];

      execSync(`${ddcCommand} ${args.join(" ")}`);
      await showHUD(`📺 Contrast: ${contrast}%`);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Contrast Control Failed",
        message: `Failed to set contrast`,
      });
      throw error;
    }
  }

  static async resetColors(): Promise<void> {
    try {
      const ddcCommand = await this.getDDCCommand();

      if (isAppleSilicon) {
        // Reset RGB channels to 100%
        execSync(`${ddcCommand} set red 100`);
        execSync(`${ddcCommand} set green 100`);
        execSync(`${ddcCommand} set blue 100`);
        await showHUD("🎨 Colors reset to normal");
      } else {
        // Reset color temperature for ddcctl
        const args = ["-d", "1", "-r", "0"]; // Disable red shift
        execSync(`${ddcCommand} ${args.join(" ")}`);
        await showHUD("🎨 Color temperature reset");
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Color Reset Failed",
        message: `Failed to reset colors`,
      });
      throw error;
    }
  }

  static async toggleEyeCare(): Promise<void> {
    try {
      const ddcCommand = await this.getDDCCommand();

      if (isAppleSilicon) {
        // Apply eye care by reducing blue light - set blue to 70%
        execSync(`${ddcCommand} set blue 70`);
        await showHUD("🌅 Eye care mode enabled");
      } else {
        // For ddcctl, use blue reduction if supported
        const args = ["-d", "1", "-b", "70"]; // Reduce blue channel
        execSync(`${ddcCommand} ${args.join(" ")}`);
        await showHUD("🌅 Eye care mode enabled");
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Eye Care Failed",
        message: `Failed to enable eye care mode`,
      });
      throw error;
    }
  }

  static async checkDDCSupport(): Promise<boolean> {
    try {
      await this.getDDCCommand();
      return true;
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Setup Required",
        message: `Run "Setup Monitor Control" command to install dependencies`,
      });
      return false;
    }
  }
}
