import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Browser integration utilities for getting current tab URLs
 */
export class BrowserIntegration {
  /**
   * Supported browsers and their AppleScript commands
   */
  private static readonly BROWSER_SCRIPTS = {
    chrome: `
      tell application "Google Chrome"
        if (count of windows) > 0 then
          get URL of active tab of front window
        else
          return ""
        end if
      end tell
    `,
    safari: `
      tell application "Safari"
        if (count of windows) > 0 then
          get URL of current tab of front window
        else
          return ""
        end if
      end tell
    `,
    firefox: `
      tell application "Firefox"
        if (count of windows) > 0 then
          get URL of active tab of front window
        else
          return ""
        end if
      end tell
    `,
    edge: `
      tell application "Microsoft Edge"
        if (count of windows) > 0 then
          get URL of active tab of front window
        else
          return ""
        end if
      end tell
    `,
    zen: `
      -- For Zen browser, we'll use a simpler approach
      -- Since Zen doesn't have full AppleScript support, we return empty
      -- The calling code will handle this gracefully
      return ""
    `,
  };

  /**
   * Gets the URL of the current active browser tab
   * @returns Promise<string | null> - Current tab URL or null if not found
   */
  static async getCurrentTabUrl(): Promise<string | null> {
    const browsers = ["zen", "chrome", "safari", "firefox", "edge"] as const;
    let zenDetected = false;

    for (const browser of browsers) {
      try {
        // Check if Zen is running for better error messaging later
        if (browser === "zen") {
          const zenRunning = await this.isBrowserRunning("zen");
          if (zenRunning) {
            zenDetected = true;
          }
        }

        const url = await this.getUrlFromBrowser(browser);
        if (url && this.isValidUrl(url)) {
          return url;
        }
      } catch (error) {
        // Continue to next browser if this one fails
        continue;
      }
    }

    // If Zen was detected but we couldn't get the URL, we can provide better error handling
    // This information can be used by the calling code to show Zen-specific instructions
    if (zenDetected) {
      console.log("Zen browser detected but URL extraction failed - recommend clipboard approach");
    }

    return null;
  }

  /**
   * Gets URL from a specific browser
   * @param browser - Browser name
   * @returns Promise<string | null> - URL or null if not found
   */
  private static async getUrlFromBrowser(
    browser: keyof typeof BrowserIntegration.BROWSER_SCRIPTS
  ): Promise<string | null> {
    try {
      // First check if the browser is running
      const isRunning = await this.isBrowserRunning(browser);
      if (!isRunning) {
        return null;
      }

      // Special handling for Zen browser since it has limited AppleScript support
      if (browser === "zen") {
        return await this.getUrlFromZenBrowser();
      }

      const script = this.BROWSER_SCRIPTS[browser];
      const { stdout } = await execAsync(`osascript -e '${script}'`);
      const url = stdout.trim();

      return url || null;
    } catch (error) {
      console.error(`Error getting URL from ${browser}:`, error);
      return null;
    }
  }

  /**
   * Gets URL from Zen browser using alternative approach
   * Since Zen has limited AppleScript support, we provide helpful guidance
   * @returns Promise<string | null> - URL or null if not found
   */
  private static async getUrlFromZenBrowser(): Promise<string | null> {
    try {
      // Zen browser has limited AppleScript support compared to Safari/Chrome
      // For Zen users, recommend using the clipboard approach:
      // 1. Press Cmd+L to select the address bar
      // 2. Press Cmd+C to copy the URL
      // 3. Use "Remove Paywall from Clipboard URL" command instead

      console.log("Zen browser detected - recommend using clipboard command instead");
      return null;
    } catch (error) {
      console.error("Error getting URL from Zen browser:", error);
      return null;
    }
  }

  /**
   * Checks if a browser is currently running
   * @param browser - Browser name
   * @returns Promise<boolean> - true if browser is running
   */
  private static async isBrowserRunning(browser: keyof typeof BrowserIntegration.BROWSER_SCRIPTS): Promise<boolean> {
    const appNames = {
      zen: "zen",
      chrome: "Google Chrome",
      safari: "Safari",
      firefox: "Firefox",
      edge: "Microsoft Edge",
    };

    try {
      const { stdout } = await execAsync(`pgrep -f "${appNames[browser]}"`);
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Validates if a string is a properly formatted URL
   * @param url - URL string to validate
   * @returns boolean - true if valid URL
   */
  private static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
      return false;
    }
  }

  /**
   * Gets the name of the currently active browser
   * @returns Promise<string | null> - Browser name or null if none found
   */
  static async getActiveBrowser(): Promise<string | null> {
    const browsers = ["zen", "chrome", "safari", "firefox", "edge"] as const;

    for (const browser of browsers) {
      try {
        const isRunning = await this.isBrowserRunning(browser);
        if (isRunning) {
          const url = await this.getUrlFromBrowser(browser);
          if (url) {
            return browser;
          }
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Gets current tab URL from a specific browser
   * @param browserName - Specific browser to get URL from
   * @returns Promise<string | null> - URL or null if not found
   */
  static async getCurrentTabUrlFromBrowser(
    browserName: keyof typeof BrowserIntegration.BROWSER_SCRIPTS
  ): Promise<string | null> {
    try {
      return await this.getUrlFromBrowser(browserName);
    } catch (error) {
      console.error(`Error getting URL from ${browserName}:`, error);
      return null;
    }
  }

  /**
   * Checks if Zen browser is currently running and active
   * @returns Promise<boolean> - true if Zen is running
   */
  static async isZenBrowserActive(): Promise<boolean> {
    try {
      return await this.isBrowserRunning("zen");
    } catch {
      return false;
    }
  }
}
