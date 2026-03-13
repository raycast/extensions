import { confirmAlert, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import * as fs from "fs";
import fetch from "node-fetch";
import * as os from "os";
import * as path from "path";

export class WeChatManager {
  private static readonly WECHAT_PATHS = {
    app: ["/Applications/WeChat.app", "/Applications/微信.app"],
    cli: ["/usr/local/bin/wechattweak-cli", "/opt/homebrew/bin/wechattweak-cli"],
    framework: (appPath: string) => [
      `${appPath}/Contents/MacOS/WeChatTweak.framework`,
      `${appPath}/Contents/Frameworks/WeChatTweak.framework`,
    ],
    binary: (appPath: string) => `${appPath}/Contents/MacOS/WeChat`,
  };

  static isHomebrewInstalled(): boolean {
    try {
      const output = execSync("command -v brew").toString();
      return output.includes("/brew");
    } catch {
      return false;
    }
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
  }

  private static async executeCommand(command: string): Promise<string> {
    try {
      return execSync(command, { encoding: "utf8", maxBuffer: 5 * 1024 * 1024 });
    } catch (error) {
      console.error("Command failed:", command, error);
      throw error;
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
        // Check if already installed
        const cliPath = this.WECHAT_PATHS.cli.find(fs.existsSync);
        if (!cliPath) {
          const brewOutput = await this.executeCommand("brew install sunnyyoung/repo/wechattweak-cli");
          console.log("Brew install output:", brewOutput);
        } else {
          console.log("WeChatTweak CLI already installed at:", cliPath);
        }
      } catch (error) {
        console.error("Failed to install wechattweak-cli:", error);
        throw new Error("Failed to install wechattweak-cli");
      }

      // Check if CLI is installed successfully
      const cliPath = this.WECHAT_PATHS.cli.find(fs.existsSync);
      if (!cliPath) {
        throw new Error("WeChatTweak CLI installation failed - CLI not found");
      }
      console.log("Found CLI at:", cliPath);

      // Install WeChatTweak using official method
      console.log("Installing WeChatTweak using official method...");
      try {
        // Create a temporary shell script with installation commands
        const installScript = `
#!/bin/bash
set -e

# Get current user
CURRENT_USER=$(whoami)

# Print debug info
echo "Current user: $CURRENT_USER"
echo "WeChat path: ${this.getWeChatPath()}"

# Use sudo to execute wechattweak-cli install
echo "Running: sudo ${cliPath} install"
sudo "${cliPath}" install

# Check installation result
echo "Installation completed, checking result..."
`;

        // Create temporary script file
        const tempScriptPath = path.join(os.tmpdir(), `wechat_install_${Date.now()}.sh`);
        fs.writeFileSync(tempScriptPath, installScript);
        fs.chmodSync(tempScriptPath, 0o755);

        // Open Terminal and execute script
        console.log("Opening Terminal to run installation script...");
        const terminalCommand = `osascript -e 'tell application "Terminal" to do script "clear && echo \\"Installing WeChatTweak...\\" && sh ${tempScriptPath} && echo \\"\\n\\nInstallation completed. You can close this window.\\" && exit"'`;

        execSync(terminalCommand);

        // Notify user to complete installation in Terminal
        await showToast({
          style: Toast.Style.Success,
          title: "Installation started in Terminal",
          message: "Please complete the installation in the Terminal window",
        });

        // Wait for user to complete installation in Terminal
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Clean up temporary script
        try {
          fs.unlinkSync(tempScriptPath);
        } catch (e) {
          console.error("Failed to clean up temp script:", e);
        }
      } catch (error) {
        console.error("Failed to start installation in Terminal:", error);
        throw new Error("Failed to start installation in Terminal");
      }

      // Verify installation
      console.log("Verifying installation...");
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        if (await this.verifyWeChatTweakInstallation()) {
          await showToast({
            style: Toast.Style.Success,
            title: "WeChatTweak installed successfully",
            message: "Please restart WeChat to apply changes",
          });
          return;
        }

        console.log(`Installation verification attempt ${attempts + 1}/${maxAttempts} failed, waiting...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempts++;
      }

      // If verification fails, prompt user to manually verify
      await showToast({
        style: Toast.Style.Failure,
        title: "Installation status unknown",
        message: "Please check Terminal for installation status",
      });
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

      await showToast({
        style: Toast.Style.Animated,
        title: "Uninstalling WeChatTweak...",
      });

      // Uninstall WeChatTweak using official method
      console.log("Uninstalling WeChatTweak using official method...");
      try {
        const cliPath = this.WECHAT_PATHS.cli.find(fs.existsSync);
        if (!cliPath) {
          throw new Error("WeChatTweak CLI not found");
        }

        // Create a temporary shell script with uninstallation commands
        const uninstallScript = `
#!/bin/bash
set -e

# Get current user
CURRENT_USER=$(whoami)

# Print debug info
echo "Current user: $CURRENT_USER"
echo "WeChat path: ${this.getWeChatPath()}"

# Use sudo to execute wechattweak-cli uninstall
echo "Running: sudo ${cliPath} uninstall"
sudo "${cliPath}" uninstall

# Check uninstallation result
echo "Uninstallation completed, checking result..."
`;

        // Create temporary script file
        const tempScriptPath = path.join(os.tmpdir(), `wechat_uninstall_${Date.now()}.sh`);
        fs.writeFileSync(tempScriptPath, uninstallScript);
        fs.chmodSync(tempScriptPath, 0o755);

        // Open Terminal and execute script
        console.log("Opening Terminal to run uninstallation script...");
        const terminalCommand = `osascript -e 'tell application "Terminal" to do script "clear && echo \\"Uninstalling WeChatTweak...\\" && sh ${tempScriptPath} && echo \\"\\n\\nUninstallation completed. You can close this window.\\" && exit"'`;

        execSync(terminalCommand);

        // Notify user to complete uninstallation in Terminal
        await showToast({
          style: Toast.Style.Success,
          title: "Uninstallation started in Terminal",
          message: "Please complete the uninstallation in the Terminal window",
        });

        // Wait for user to complete uninstallation in Terminal
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Clean up temporary script
        try {
          fs.unlinkSync(tempScriptPath);
        } catch (e) {
          console.error("Failed to clean up temp script:", e);
        }
      } catch (error) {
        console.error("Failed to start uninstallation in Terminal:", error);
        throw new Error("Failed to start uninstallation in Terminal");
      }

      // Uninstall CLI tool
      console.log("Removing wechattweak-cli...");
      try {
        await this.executeCommand("brew uninstall sunnyyoung/repo/wechattweak-cli");
      } catch (error) {
        console.error("Failed to uninstall wechattweak-cli:", error);
      }

      // Verify uninstallation
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        if (!(await this.verifyWeChatTweakInstallation())) {
          await showToast({
            style: Toast.Style.Success,
            title: "WeChatTweak uninstalled successfully",
            message: "Please restart WeChat to apply changes",
          });
          return;
        }

        console.log(`Uninstallation verification attempt ${attempts + 1}/${maxAttempts} failed, waiting...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempts++;
      }

      // If verification fails, prompt user to manually verify
      await showToast({
        style: Toast.Style.Failure,
        title: "Uninstallation status unknown",
        message: "Please check Terminal for uninstallation status",
      });
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

      // Wait for service to start
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
