import { Application } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export type BrowserIds = "company.thebrowser.Browser" | "com.apple.Safari" | "com.google.Chrome" | "com.brave.Browser";

export interface IBrowser {
  getCurrentTabUrl(): Promise<string | undefined>;
  setCurrentTabUrl(url: string): Promise<void>;
  openUrl(url: string): Promise<void>;
}

export class Browser implements IBrowser {
  constructor(protected readonly name: string) {}

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
  async getCurrentTabUrl() {
    const response = await runAppleScript(`
      tell application "${this.name}"
        return URL of active tab of front window
      end tell
    `);

    return response ? (response as string) : undefined;
  }

  async setCurrentTabUrl(url: string) {
    await runAppleScript(`
      tell application "${this.name}"
        set URL of active tab of front window to "${url}"
      end tell
    `);
  }

  async openUrl(url: string) {
    await runAppleScript(`
      tell application "${this.name}"
        open location "${url}"
      end tell
    `);
  }
}

export class Safari extends Browser {
  async getCurrentTabUrl() {
    const response = await runAppleScript(`
      tell application "${this.name}"
        return URL of current tab of front window
      end tell
    `);

    return response ? (response as string) : undefined;
  }

  async setCurrentTabUrl(url: string) {
    await runAppleScript(`
      tell application "${this.name}"
        set URL of current tab of front window to "${url}"
      end tell
    `);
  }

  async openUrl(url: string) {
    await runAppleScript(`
      tell application "${this.name}"
        open location "${url}"
      end tell
    `);
  }
}

export class Chrome extends Browser {
  async getCurrentTabUrl() {
    const response = await runAppleScript(`
      tell application "${this.name}"
        return URL of active tab of front window
      end tell
    `);

    return response ? (response as string) : undefined;
  }

  async setCurrentTabUrl(url: string) {
    await runAppleScript(`
      tell application "${this.name}"
        set URL of active tab of front window to "${url}"
      end tell
    `);
  }

  async openUrl(url: string) {
    await runAppleScript(`
      tell application "${this.name}"
        open location "${url}"
      end tell
    `);
  }
}

const instances: Partial<Record<BrowserIds, Browser>> = {};

export function getBrowser(application?: Application) {
  if (!application) {
    return undefined;
  }

  const browserId = application.bundleId as BrowserIds;

  if (!browserId) {
    return undefined;
  }

  if (!instances[browserId]) {
    switch (browserId) {
      case "com.apple.Safari":
        instances[browserId] = new Safari(application.name);
        break;
      case "company.thebrowser.Browser":
        instances[browserId] = new Arc(application.name);
        break;
      case "com.google.Chrome":
      case "com.brave.Browser":
        instances[browserId] = new Chrome(application.name);
        break;
    }
  }

  return instances[browserId];
}
