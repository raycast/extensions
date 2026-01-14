import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface BrowserInfo {
  name: string;
  processName: string;
  script: string;
}

const browsers: BrowserInfo[] = [
  {
    name: "Safari",
    processName: "Safari",
    script: 'tell application "Safari" to return URL of front document',
  },
  {
    name: "Google Chrome",
    processName: "Google Chrome",
    script: 'tell application "Google Chrome" to return URL of active tab of front window',
  },
  {
    name: "Microsoft Edge",
    processName: "Microsoft Edge",
    script: 'tell application "Microsoft Edge" to return URL of active tab of front window',
  },
  {
    name: "Firefox",
    processName: "Firefox",
    script: 'tell application "Firefox" to return URL of front document',
  },
];

async function isAppRunning(processName: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`pgrep -x "${processName}"`);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

async function getBrowserUrl(browser: BrowserInfo): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`osascript -e '${browser.script}'`);
    return stdout.trim();
  } catch {
    return null;
  }
}

export async function getActiveBrowserUrl(): Promise<string | null> {
  for (const browser of browsers) {
    if (await isAppRunning(browser.processName)) {
      const url = await getBrowserUrl(browser);
      if (url) {
        return url;
      }
    }
  }
  return null;
}

export async function openInChrome(url: string): Promise<void> {
  let targetUrl = url;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    targetUrl = `https://${url}`;
  }
  await execAsync(`open -a "Google Chrome" "${targetUrl}"`);
}

export async function openChromeIncognito(): Promise<void> {
  await execAsync('open -na "Google Chrome" --args --incognito');
}
