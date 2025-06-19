import { exec } from "child_process";
import { promisify } from "util";
import {
  TaskAction,
  BrowserAction,
  TerminalAction,
  RecordingSession,
} from "../types";
import { saveActiveSession, getActiveSession, getCurrentUser } from "./storage";

const execAsync = promisify(exec);

export class TaskRecorder {
  private static instance: TaskRecorder;
  private activeSession: RecordingSession | null = null;
  private browserMonitorInterval: NodeJS.Timeout | null = null;
  private terminalMonitorInterval: NodeJS.Timeout | null = null;
  private lastBrowserState: {
    browser?: string;
    url?: string;
    tabId?: string;
    windowId?: string;
  } = {};

  static getInstance(): TaskRecorder {
    if (!TaskRecorder.instance) {
      TaskRecorder.instance = new TaskRecorder();
    }
    return TaskRecorder.instance;
  }

  async startRecording(): Promise<string> {
    try {
      // Clear any existing sessions first
      await this.clearAllSessions();

      const userName = await getCurrentUser();
      const sessionId = `session_${Date.now()}`;

      this.activeSession = {
        id: sessionId,
        startTime: Date.now(),
        isActive: true,
        actions: [],
        userName,
      };

      await saveActiveSession(this.activeSession);
      this.startMonitoring();

      return sessionId;
    } catch (error) {
      console.error("Error starting recording:", error);
      throw new Error(
        `Failed to start recording: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private async clearAllSessions(): Promise<void> {
    try {
      // Stop any existing monitoring
      this.stopMonitoring();
      // Clear instance session
      this.activeSession = null;
      // Clear stored session
      const { clearActiveSession } = await import("./storage");
      await clearActiveSession();
    } catch (error) {
      console.error("Error clearing sessions:", error);
      // Don't throw, just log the error
    }
  }

  async stopRecording(): Promise<RecordingSession | null> {
    try {
      // Check both instance and stored session
      const currentSession = this.activeSession || (await getActiveSession());
      if (!currentSession?.isActive) {
        throw new Error("No active recording session");
      }

      this.stopMonitoring();
      currentSession.isActive = false;

      const session = { ...currentSession };
      this.activeSession = null;

      await saveActiveSession(session);
      return session;
    } catch (error) {
      console.error("Error stopping recording:", error);
      throw new Error(
        `Failed to stop recording: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async addAction(action: TaskAction): Promise<void> {
    try {
      if (!this.activeSession?.isActive) return;

      // Check for duplicate with the most recent action
      if (this.isDuplicateAction(action)) {
        return; // Skip duplicate action
      }

      this.activeSession.actions.push(action);
      await saveActiveSession(this.activeSession);
    } catch (error) {
      console.error("Error adding action:", error);
      // Don't throw here to avoid interrupting monitoring
    }
  }

  private isDuplicateAction(newAction: TaskAction): boolean {
    if (!this.activeSession?.actions.length) return false;

    const lastAction =
      this.activeSession.actions[this.activeSession.actions.length - 1];

    // If different types, not a duplicate
    if (lastAction.type !== newAction.type) return false;

    // Check for duplicates based on action type
    switch (newAction.type) {
      case "browser":
        return this.isBrowserActionDuplicate(
          lastAction.data as any,
          newAction.data as any
        );
      case "terminal":
        return this.isTerminalActionDuplicate(
          lastAction.data as any,
          newAction.data as any
        );
      case "application":
        return this.isApplicationActionDuplicate(
          lastAction.data as any,
          newAction.data as any
        );
      case "file":
        return this.isFileActionDuplicate(
          lastAction.data as any,
          newAction.data as any
        );
      default:
        return false;
    }
  }

  private isBrowserActionDuplicate(lastData: any, newData: any): boolean {
    // Consider same URL, action type, and tab context as duplicate
    return (
      lastData.url === newData.url &&
      lastData.action === newData.action &&
      lastData.browser === newData.browser &&
      lastData.tabContext === newData.tabContext
    );
  }

  private isTerminalActionDuplicate(lastData: any, newData: any): boolean {
    // Consider same command in same directory as duplicate
    return (
      lastData.command === newData.command &&
      lastData.directory === newData.directory
    );
  }

  private isApplicationActionDuplicate(lastData: any, newData: any): boolean {
    // Consider same app and action as duplicate
    return lastData.app === newData.app && lastData.action === newData.action;
  }

  private isFileActionDuplicate(lastData: any, newData: any): boolean {
    // Consider same file path and action as duplicate
    return lastData.path === newData.path && lastData.action === newData.action;
  }

  private startMonitoring(): void {
    this.startBrowserMonitoring();
    this.startTerminalMonitoring();
  }

  private stopMonitoring(): void {
    if (this.browserMonitorInterval) {
      clearInterval(this.browserMonitorInterval);
      this.browserMonitorInterval = null;
    }
    if (this.terminalMonitorInterval) {
      clearInterval(this.terminalMonitorInterval);
      this.terminalMonitorInterval = null;
    }
  }

  private startBrowserMonitoring(): void {
    console.log("Starting browser monitoring...");
    this.browserMonitorInterval = setInterval(async () => {
      try {
        const activeApp = await this.getActiveApplication();
        console.log("Active app:", activeApp);

        if (this.isBrowserApp(activeApp)) {
          console.log("Browser detected, getting data...");
          const browserData = await this.getCurrentBrowserData();
          console.log("Browser data:", browserData);

          if (
            browserData &&
            browserData.url &&
            browserData.url !== "firefox://url-not-accessible"
          ) {
            const tabContext = this.determineTabContext(browserData);
            console.log("Tab context:", tabContext);

            const action: TaskAction = {
              id: `browser_${Date.now()}`,
              type: "browser",
              timestamp: Date.now(),
              data: {
                url: browserData.url,
                title: browserData.title,
                action: "navigate",
                browser: browserData.browser,
                tabContext: tabContext,
                tabId: browserData.tabId,
              } as BrowserAction,
            };

            console.log("Adding browser action:", action);

            // Update last state
            this.lastBrowserState = {
              browser: browserData.browser,
              url: browserData.url,
              tabId: browserData.tabId,
              windowId: browserData.windowId,
            };

            await this.addAction(action);
          }
        }
      } catch (error) {
        console.error("Browser monitoring error:", error);
      }
    }, 3000); // Increased interval to 3 seconds for debugging
  }

  private startTerminalMonitoring(): void {
    this.terminalMonitorInterval = setInterval(async () => {
      try {
        const activeApp = await this.getActiveApplication();
        if (this.isTerminalApp(activeApp)) {
          const recentCommands = await this.getRecentTerminalCommands();
          for (const command of recentCommands) {
            const action: TaskAction = {
              id: `terminal_${Date.now()}_${Math.random()}`,
              type: "terminal",
              timestamp: Date.now(),
              data: command,
            };
            await this.addAction(action);
          }
        }
      } catch (error) {
        console.error("Terminal monitoring error:", error);
      }
    }, 3000);
  }

  private async getActiveApplication(): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`
      );
      return stdout.trim();
    } catch {
      return "";
    }
  }

  private isBrowserApp(appName: string): boolean {
    const browsers = [
      "Safari",
      "Google Chrome",
      "Firefox",
      "Microsoft Edge",
      "Arc",
    ];
    return browsers.some((browser) => appName.includes(browser));
  }

  private isTerminalApp(appName: string): boolean {
    const terminals = ["Terminal", "iTerm", "Hyper", "Alacritty", "Kitty"];
    return terminals.some((terminal) => appName.includes(terminal));
  }

  private async getCurrentBrowserData(): Promise<{
    url: string;
    title?: string;
    browser: string;
    tabId?: string;
    windowId?: string;
  } | null> {
    try {
      // First get the active application
      const activeApp = await this.getActiveApplication();
      if (!this.isBrowserApp(activeApp)) {
        return null;
      }

      let browserData: any = null;

      if (activeApp.includes("Safari")) {
        try {
          const { stdout } = await execAsync(
            `osascript -e 'tell application "Safari" to get URL of current tab of front window'`
          );
          const url = stdout.trim();
          if (url) {
            browserData = {
              url,
              browser: "Safari",
              title: undefined,
              windowId: "1",
              tabId: "1",
            };
          }
        } catch (error) {
          console.error("Safari URL access error:", error);
        }
      } else if (activeApp.includes("Google Chrome")) {
        try {
          const { stdout } = await execAsync(
            `osascript -e 'tell application "Google Chrome" to get URL of active tab of front window'`
          );
          const url = stdout.trim();
          if (url) {
            browserData = {
              url,
              browser: "Google Chrome",
              title: undefined,
              windowId: "1",
              tabId: "1",
            };
          }
        } catch (error) {
          console.error("Chrome URL access error:", error);
        }
      } else if (activeApp.includes("Arc")) {
        try {
          const { stdout } = await execAsync(
            `osascript -e 'tell application "Arc" to get URL of active tab of front window'`
          );
          const url = stdout.trim();
          if (url) {
            browserData = {
              url,
              browser: "Arc",
              title: undefined,
              windowId: "1",
              tabId: "1",
            };
          }
        } catch (error) {
          console.error("Arc URL access error:", error);
        }
      } else if (activeApp.includes("Firefox")) {
        // Firefox doesn't support AppleScript URL access
        browserData = {
          url: "firefox://url-not-accessible",
          browser: "Firefox",
          title: "Firefox Tab",
          windowId: "1",
          tabId: "1",
        };
      }

      return browserData;
    } catch (error) {
      console.error("Browser data collection error:", error);
      return null;
    }
  }

  private determineTabContext(currentData: {
    url: string;
    browser: string;
    tabId?: string;
    windowId?: string;
  }): "same_tab" | "new_tab" | "new_window" {
    // If no previous state, assume new navigation
    if (!this.lastBrowserState.url) {
      return "new_tab";
    }

    // If different browser, definitely new window
    if (this.lastBrowserState.browser !== currentData.browser) {
      return "new_window";
    }

    // If same URL, likely refresh or back/forward (same tab)
    if (this.lastBrowserState.url === currentData.url) {
      return "same_tab";
    }

    // If same browser but different URL, assume same tab navigation
    // (This is a simplified approach since we can't reliably track tab IDs)
    return "same_tab";
  }

  private async getRecentTerminalCommands(): Promise<TerminalAction[]> {
    try {
      const { stdout } = await execAsync(
        `tail -n 5 ~/.bash_history ~/.zsh_history 2>/dev/null | grep -v "^#" | tail -n 3`
      );
      const commands = stdout.trim().split("\n").filter(Boolean);

      return commands.map((command) => ({
        command: command.trim(),
        directory: process.cwd(),
        output: undefined,
        exitCode: undefined,
      }));
    } catch {
      return [];
    }
  }

  async getSessionStatus(): Promise<RecordingSession | null> {
    try {
      if (this.activeSession) return this.activeSession;
      return await getActiveSession();
    } catch (error) {
      console.error("Error getting session status:", error);
      return null;
    }
  }
}
