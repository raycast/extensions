import { confirmAlert, showToast, Toast } from "@raycast/api";
import { execSync, spawn } from "child_process";
import * as fs from "fs";
import fetch from "node-fetch";
import { EnvironmentDetector } from "./environmentDetector";

export class WeChatManager {
  private static readonly WECHAT_PATHS = {
    app: ["/Applications/WeChat.app", "/Applications/微信.app"],
    cli: [
      `${EnvironmentDetector.getHomebrewBinPath()}/wechattweak-cli`,
      "/usr/local/bin/wechattweak-cli",
      "/opt/homebrew/bin/wechattweak-cli",
    ],
    framework: (appPath: string) => [
      `${appPath}/Contents/MacOS/WeChatTweak.framework`,
      `${appPath}/Contents/Frameworks/WeChatTweak.framework`,
    ],
    binary: (appPath: string) => `${appPath}/Contents/MacOS/WeChat`,
  };

  /**
   * Promise with timeout
   * @param promise original Promise
   * @param timeoutMs timeout (milliseconds)
   * @param errorMessage timeout error message
   */
  private static async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number = 5000,
    errorMessage: string = "Operation timed out",
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutId!);
    }
  }

  static isHomebrewInstalled(): boolean {
    return EnvironmentDetector.isHomebrewInstalled();
  }

  static getWeChatPath(): string | null {
    return this.WECHAT_PATHS.app.find(fs.existsSync) ?? null;
  }

  static isWeChatInstalled(): boolean {
    return this.getWeChatPath() !== null;
  }

  static isWeChatRunning(): boolean {
    try {
      const output = execSync('ps aux | grep -v grep | grep -i "WeChat.app/Contents/MacOS/WeChat"').toString();
      return output.toLowerCase().includes("wechat");
    } catch {
      return false;
    }
  }

  static async isWeChatServiceRunning(): Promise<boolean> {
    try {
      return await this.withTimeout(
        (async () => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1000);

            const response = await fetch("http://localhost:48065/wechat/search?keyword=", {
              method: "GET",
              signal: controller.signal,
            });

            clearTimeout(timeoutId);
            return response.ok;
          } catch {
            return false;
          }
        })(),
        2000,
        "Service check timed out",
      );
    } catch (error) {
      console.error("Error checking WeChat service:", error);
      return false;
    }
  }

  static isWeChatTweakInstalled(): boolean {
    try {
      const wechatPath = this.getWeChatPath();
      if (!wechatPath) return false;

      // Check CLI tool
      const isCLIInstalled = this.WECHAT_PATHS.cli.some(fs.existsSync);

      // Check Framework
      const frameworkPaths = this.WECHAT_PATHS.framework(wechatPath);
      const isFrameworkInstalled = frameworkPaths.some(fs.existsSync);

      // Check binary file modification
      const binary = this.WECHAT_PATHS.binary(wechatPath);
      if (!fs.existsSync(binary)) return false;

      try {
        const output = execSync(`otool -L "${binary}"`).toString();
        const hasTweakDylib = output.includes("WeChatTweak.framework");
        return isCLIInstalled && isFrameworkInstalled && hasTweakDylib;
      } catch (e) {
        console.error("Error checking binary:", e);
        return false;
      }
    } catch (e) {
      console.error("Error checking WeChatTweak installation:", e);
      return false;
    }
  }

  static async verifyWeChatTweakInstallation(): Promise<boolean> {
    try {
      const wechatPath = this.getWeChatPath();
      if (!wechatPath) return false;

      // Check CLI tool
      const isCLIInstalled = this.WECHAT_PATHS.cli.some(fs.existsSync);
      if (!isCLIInstalled) {
        console.log("CLI not installed");
        return false;
      }

      // Check Framework
      const frameworkPaths = this.WECHAT_PATHS.framework(wechatPath);
      let isFrameworkInstalled = false;

      for (const path of frameworkPaths) {
        if (fs.existsSync(path)) {
          console.log(`Framework found at: ${path}`);
          isFrameworkInstalled = true;
          break;
        }
      }

      if (!isFrameworkInstalled) {
        console.log("Framework not installed");
        return false;
      }

      // Check binary file modification
      const binary = this.WECHAT_PATHS.binary(wechatPath);
      if (!fs.existsSync(binary)) {
        console.log("Binary not found");
        return false;
      }

      try {
        const output = execSync(`otool -L "${binary}"`).toString();
        const hasTweakDylib = output.includes("WeChatTweak.framework");
        if (!hasTweakDylib) {
          console.log("Binary not modified with WeChatTweak");
          return false;
        }

        return true;
      } catch (e) {
        console.error("Error checking binary:", e);
        return false;
      }
    } catch (e) {
      console.error("Error verifying WeChatTweak installation:", e);
      return false;
    }
  }

  static async installWeChatTweak(): Promise<void> {
    try {
      // Make sure the PATH environment variable is correct
      EnvironmentDetector.fixPath();

      if (!this.isHomebrewInstalled()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Homebrew is not installed",
          message: "Please install Homebrew first",
        });
        return;
      }

      if (this.isWeChatRunning()) {
        const shouldContinue = await confirmAlert({
          title: "WeChat is running",
          message: "WeChat must be closed before installation. Do you want to close it now?",
          primaryAction: {
            title: "Close WeChat and Continue",
          },
          dismissAction: {
            title: "Cancel",
          },
        }).catch(() => false);

        if (!shouldContinue) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Installation cancelled",
            message: "Please close WeChat and try again",
          });
          return;
        }

        // Close WeChat
        try {
          execSync("killall WeChat || killall 微信");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error) {
          console.error("Failed to close WeChat:", error);
        }
      }

      await showToast({
        style: Toast.Style.Animated,
        title: "Installing WeChatTweak...",
      });

      // Install WeChatTweak-cli
      console.log("Installing wechattweak-cli...");
      try {
        // Check if it is installed
        const cliPath = this.WECHAT_PATHS.cli.find(fs.existsSync);
        if (!cliPath) {
          // Use the correct Homebrew path
          const brewBin = EnvironmentDetector.getHomebrewBinPath() + "/brew";
          console.log(`Running: ${brewBin} install sunnyyoung/repo/wechattweak-cli`);

          // Execute brew install in a non-blocking manner
          const brewProcess = spawn(brewBin, ["install", "sunnyyoung/repo/wechattweak-cli"], {
            stdio: "inherit",
          });

          // Wait for brew install to complete
          await new Promise<void>((resolve, reject) => {
            brewProcess.on("close", (code: number) => {
              if (code === 0) {
                resolve();
              } else {
                reject(new Error(`Brew install failed with code ${code}`));
              }
            });

            brewProcess.on("error", (err: Error) => {
              reject(err);
            });
          });
        } else {
          console.log("WeChatTweak CLI already installed at:", cliPath);
        }
      } catch (error) {
        console.error("Failed to install wechattweak-cli:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to install wechattweak-cli",
          message: error instanceof Error ? error.message : String(error),
        });
        return;
      }

      // Check whether the CLI is installed successfully
      const cliPath = this.WECHAT_PATHS.cli.find(fs.existsSync);
      if (!cliPath) {
        await showToast({
          style: Toast.Style.Failure,
          title: "WeChatTweak CLI installation failed",
          message: "CLI tool not found after installation",
        });
        return;
      }
      console.log("Found CLI at:", cliPath);

      // Use non-blocking method to open Terminal and execute commands
      const installCommand = `osascript -e 'tell application "Terminal" to do script "echo \\"Installing WeChatTweak...\\" && sudo ${cliPath} install && echo \\"\\n\\nInstallation completed. You can close this window.\\" && exit"'`;

      console.log("Running install command in Terminal");

      // Use spawn instead of execSync to avoid blocking
      const process = spawn("bash", ["-c", installCommand], {
        detached: true,
        stdio: "ignore",
      });

      // Detach the child process and let it run in the background
      process.unref();

      await showToast({
        style: Toast.Style.Success,
        title: "Installation started in Terminal",
        message: "Please complete the process in the Terminal window",
      });

      // Prompt the user to manually refresh the status after the installation is complete
      await showToast({
        style: Toast.Style.Success,
        title: "After installation completes",
        message: "Please click 'Refresh Status' to update",
      });

      return;
    } catch (error) {
      console.error("Installation error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to install WeChatTweak",
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  static async uninstallWeChatTweak(): Promise<void> {
    try {
      // Make sure the PATH environment variable is correct
      EnvironmentDetector.fixPath();

      if (this.isWeChatRunning()) {
        const shouldContinue = await confirmAlert({
          title: "WeChat is running",
          message: "WeChat must be closed before uninstallation. Do you want to close it now?",
          primaryAction: {
            title: "Close WeChat and Continue",
          },
          dismissAction: {
            title: "Cancel",
          },
        }).catch(() => false);

        if (!shouldContinue) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Uninstallation cancelled",
            message: "Please close WeChat and try again",
          });
          return;
        }

        // Close WeChat
        try {
          execSync("killall WeChat || killall 微信");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error) {
          console.error("Failed to close WeChat:", error);
        }
      }

      // Finding the CLI Tools Path
      const cliPath = this.WECHAT_PATHS.cli.find(fs.existsSync);
      if (!cliPath) {
        await showToast({
          style: Toast.Style.Failure,
          title: "WeChatTweak CLI not found",
          message: "Cannot proceed with uninstallation",
        });
        return;
      }

      // Open Terminal and execute the command in a non-blocking manner
      // This way Raycast will not wait for the command to complete
      const uninstallCommand = `osascript -e 'tell application "Terminal" to do script "echo \\"Uninstalling WeChatTweak...\\" && sudo ${cliPath} uninstall && echo \\"\\n\\nUninstallation completed. You can close this window.\\" && exit"'`;

      console.log("Running uninstall command in Terminal");

      // Use spawn instead of execSync to avoid blocking
      const process = spawn("bash", ["-c", uninstallCommand], {
        detached: true,
        stdio: "ignore",
      });

      // Detach the child process and let it run in the background
      process.unref();

      await showToast({
        style: Toast.Style.Success,
        title: "Uninstallation started in Terminal",
        message: "Please complete the process in the Terminal window",
      });

      // Prompt the user to manually refresh the status after uninstallation is complete
      await showToast({
        style: Toast.Style.Success,
        title: "After uninstallation completes",
        message: "Please click 'Refresh Status' to update",
      });

      return;
    } catch (error) {
      console.error("Uninstallation error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to uninstall WeChatTweak",
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  static async startWeChat(): Promise<void> {
    try {
      const wechatPath = this.getWeChatPath();
      if (!wechatPath) {
        await showToast({
          style: Toast.Style.Failure,
          title: "WeChat not found",
          message: "Please install WeChat first",
        });
        return;
      }

      if (this.isWeChatRunning()) {
        await showToast({
          style: Toast.Style.Success,
          title: "WeChat is already running",
        });
        return;
      }

      await showToast({
        style: Toast.Style.Animated,
        title: "Starting WeChat...",
      });

      execSync(`open "${wechatPath}"`);

      // Waiting for the service to start
      let attempts = 0;
      while (attempts < 15) {
        if (await this.isWeChatServiceRunning()) {
          await showToast({
            style: Toast.Style.Success,
            title: "WeChat started successfully",
          });
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;
      }

      await showToast({
        style: Toast.Style.Success,
        title: "WeChat started",
        message: "Service might take a moment to start",
      });
    } catch (error) {
      console.error("Error starting WeChat:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to start WeChat",
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  static async restartWeChat(): Promise<void> {
    try {
      if (this.isWeChatRunning()) {
        await showToast({
          style: Toast.Style.Animated,
          title: "Closing WeChat...",
        });
        execSync("killall WeChat || killall 微信");
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      await this.startWeChat();
    } catch (error) {
      console.error("Error restarting WeChat:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to restart WeChat",
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
