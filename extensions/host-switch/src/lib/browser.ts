import { Application } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export type BrowserNames = "Safari" | "Arc" | "Chrome";

export interface IBrowser {
  getCurrentTabUrl(): Promise<string | undefined>;
  setCurrentTabUrl(url: string): Promise<void>;
  openUrl(url: string): Promise<void>;
}

export class Browser implements IBrowser {
  getCurrentTabUrl() {
    return Promise.resolve<string | undefined>(undefined);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setCurrentTabUrl(url: string) {
    return Promise.resolve();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  openUrl(url: string) {
    return Promise.resolve();
  }

  async switch(target: string) {
    const currentUrl = await this.getCurrentTabUrl();
    if (currentUrl) {
      const url = new URL(currentUrl);
      const targetUrl = new URL(target);

      url.protocol = targetUrl.protocol;
      url.hostname = targetUrl.hostname;
      url.port = targetUrl.port;

      await this.setCurrentTabUrl(url.toString());
    }
  }
}

export class Arc extends Browser {
  static readonly browserName = "Arc";

  async getCurrentTabUrl() {
    const response = await runAppleScript(`
      tell application "Arc"
        return URL of active tab of front window
      end tell
    `);

    return response ? (response as string) : undefined;
  }

  async setCurrentTabUrl(url: string) {
    await runAppleScript(`
      tell application "Arc"
        set URL of active tab of front window to "${url}"
      end tell
    `);
  }

  async openUrl(url: string) {
    await runAppleScript(`
      tell application "Arc"
        open location "${url}"
      end tell
    `);
  }
}

export class Safari extends Browser {
  async getCurrentTabUrl() {
    const response = await runAppleScript(`
      tell application "Safari"
        return URL of current tab of front window
      end tell
    `);

    return response ? (response as string) : undefined;
  }

  async setCurrentTabUrl(url: string) {
    await runAppleScript(`
      tell application "Safari"
        set URL of current tab of front window to "${url}"
      end tell
    `);
  }

  async openUrl(url: string) {
    await runAppleScript(`
      tell application "Safari"
        open location "${url}"
      end tell
    `);
  }
}

export class Chrome extends Browser {
  async getCurrentTabUrl() {
    const response = await runAppleScript(`
      tell application "Google Chrome"
        return URL of active tab of front window
      end tell
    `);

    return response ? (response as string) : undefined;
  }

  async setCurrentTabUrl(url: string) {
    await runAppleScript(`
      tell application "Google Chrome"
        set URL of active tab of front window to "${url}"
      end tell
    `);
  }

  async openUrl(url: string) {
    await runAppleScript(`
      tell application "Chrome"
        open location "${url}"
      end tell
    `);
  }
}

const instances: Partial<Record<BrowserNames, Browser>> = {};

export function getBrowser(application?: Application) {
  if (!application) {
    return undefined;
  }

  const browserName = application.name as BrowserNames;

  if (!browserName) {
    return undefined;
  }

  if (!instances[browserName]) {
    switch (browserName) {
      case "Safari":
        instances[browserName] = new Safari();
        break;
      case "Arc":
        instances[browserName] = new Arc();
        break;
      case "Chrome":
        instances[browserName] = new Chrome();
        break;
    }
  }

  return instances[browserName];
}
