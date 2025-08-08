import { exec } from "child_process";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const execFileAsync = promisify(execFile);
const isWin = process.platform === "win32";

function getMacOSDefaultBrowser() {
  return new Promise<string>((resolve, reject) => {
    const command = `defaults read ~/Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure | awk -F'"' '/http;/{print window[(NR)-1]}{window[NR]=$2}'`;
    exec(command, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout.trim() as string);
      }
    });
  });
}

// Taken by here.. https://github.com/sindresorhus/default-browser/blob/main/windows.js
async function getWindowsDefaultBrowser(): Promise<string> {
  const { stdout } = await execFileAsync("reg", [
    "QUERY",
    " HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice",
    "/v",
    "ProgId",
  ]);

  const match = /ProgId\s*REG_SZ\s*(?<id>\S+)/.exec(stdout);
  if (!match) {
    throw new Error(`Cannot find Windows browser in stdout: ${JSON.stringify(stdout)}`);
  }

  const { id } = match.groups;

  return getBrowserNameFromProgIdRegex(id);
}

function getBrowserNameFromProgIdRegex(progId: string) {
  const suffixRegex = /(?:HTML|DHTML|HTM|URL|BHTML|SSHTM|\.HTTP)$/;

  const baseName = progId.replace(suffixRegex, "");

  return baseName;
}

export async function getDefaultBrowser() {
  if (isWin) {
    const defaultBrowserWin = await getWindowsDefaultBrowser();
    return defaultBrowserWin;
  }

  const defaultBrowserMac = await getMacOSDefaultBrowser();
  return defaultBrowserMac;
}
