import { useExec } from "@raycast/utils";
import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import { useMemo } from "react";

// Used to detect the current system environment, installation path, etc.

export class EnvironmentDetector {
  /**
   * Detect whether the current chip is Apple Silicon
   * @returns Is it an Apple Silicon chip?
   */
  static isAppleSilicon(): boolean {
    try {
      const cpus = os.cpus();
      if (cpus.length === 0) throw new Error("No CPU information available");
      return cpus[0].model.includes("Apple");
    } catch (error) {
      console.error("Error detecting CPU architecture:", error);
      // If the test fails, try another method
      try {
        const archOutput = execSync("uname -m").toString().trim();
        return archOutput === "arm64";
      } catch {
        // The default return value is false, indicating that it may be an Intel chip.
        return false;
      }
    }
  }

  /**
   * Get the Homebrew installation path
   * @returns the Homebrew installation path
   */
  static getHomebrewPath(): string {
    return this.isAppleSilicon() ? "/opt/homebrew" : "/usr/local";
  }

  /**
   * Get the Homebrew bin directory path
   * @returns the Homebrew bin directory path
   */
  static getHomebrewBinPath(): string {
    return `${this.getHomebrewPath()}/bin`;
  }

  /**
   * Get WeChatTweak-CLI path
   * @returns WeChatTweak-CLI path
   */
  static getWeChatTweakCliPath(): string {
    const possiblePaths = [
      `${this.getHomebrewBinPath()}/wechattweak-cli`,
      "/usr/local/bin/wechattweak-cli",
      "/opt/homebrew/bin/wechattweak-cli",
    ];

    for (const path of possiblePaths) {
      if (fs.existsSync(path)) {
        return path;
      }
    }

    // By default, the path is returned based on the schema.
    return `${this.getHomebrewBinPath()}/wechattweak-cli`;
  }

  /**
   * Fix the PATH environment variable
   * Make sure to include necessary paths
   */
  static fixPath(): void {
    if (!process.env.PATH || process.env.PATH === "") {
      process.env.PATH = [
        "/opt/homebrew/bin", // Apple Silicon Mac
        "/usr/local/bin", // Intel Mac
        "/usr/bin",
        "/bin",
        "/usr/sbin",
        "/sbin",
      ].join(":");
    } else if (!process.env.PATH.includes(this.getHomebrewBinPath())) {
      // Add the Homebrew bin path to PATH
      process.env.PATH = `${this.getHomebrewBinPath()}:${process.env.PATH}`;
    }
  }

  /**
   * Check if Homebrew is installed
   * @returns whether Homebrew is installed
   */
  static isHomebrewInstalled(): boolean {
    try {
      const brewPath = `${this.getHomebrewBinPath()}/brew`;
      return fs.existsSync(brewPath);
    } catch (error) {
      console.error("Error checking Homebrew installation:", error);
      return false;
    }
  }
}

/**
 * React Hook that executes commands using Homebrew
 * @param formula Homebrew formula name
 * @param args command parameters
 * @returns execution results
 */
export function useHomebrew(formula: string, args: string[] = []) {
  const brewPath = EnvironmentDetector.isAppleSilicon() ? "/opt/homebrew/bin/brew" : "/usr/local/bin/brew";

  return useExec(brewPath, [formula, ...args]);
}

/**
 * React Hook to get the list of installed Homebrew packages
 * @returns the list of installed packages
 */
export function useInstalledBrewPackages() {
  const brewPath = EnvironmentDetector.isAppleSilicon() ? "/opt/homebrew/bin/brew" : "/usr/local/bin/brew";

  const { isLoading, data, error, revalidate } = useExec(brewPath, ["info", "--json=v2", "--installed"]);

  const packages = useMemo(() => {
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return parsed.formulae || [];
    } catch (e) {
      console.error("Error parsing brew packages:", e);
      return [];
    }
  }, [data]);

  return { isLoading, packages, error, revalidate };
}
