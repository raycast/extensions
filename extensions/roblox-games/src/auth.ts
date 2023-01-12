import { exec } from "child_process";
import { existsSync, promises as fs } from "fs";
import fetch from "node-fetch";
import { homedir } from "os";

const configPath = homedir() + "/Library/Preferences/com.roblox.RobloxStudioBrowser.plist";
let cookie: Promise<string> | undefined;

export function studioConfigExists(): boolean {
  return existsSync(configPath);
}

export async function getRobloxCookie(): Promise<string> {
  if (cookie)
    return cookie.catch(() => {
      cookie = undefined;
      return getRobloxCookie();
    });
  const stat = await fs.stat(configPath);
  if (!stat.isFile() || stat.size < 10)
    throw new Error("Roblox Studio config file is invalid, please start Roblox Studio & log in.");
  return (cookie = new Promise((resolve, reject) => {
    exec(
      "plutil -convert json ~/Library/Preferences/com.roblox.RobloxStudioBrowser.plist -o -",
      (err, stdout, stderr) => {
        if (err || stderr) {
          cookie = undefined;
          return reject(err || new Error(stderr));
        }
        const json = JSON.parse(stdout);
        const robloxSecurity = (
          Object.entries(json).find(([key]) => key.includes("ROBLOSECURITY")) as string[]
        )[1] as string;
        if (!robloxSecurity) {
          cookie = undefined;
          return reject(new Error("Roblox Studio config file is invalid, please start Roblox Studio & log in."));
        }
        return resolve(robloxSecurity.split("COOK::<")[1].split(">")[0]);
      }
    );
  }));
}

async function getCSRFToken() {
  const cookie = await getRobloxCookie();
  const response = await fetch("https://auth.roblox.com/v2/logout", {
    method: "post",
    headers: {
      cookie: " .ROBLOSECURITY=" + cookie + ";",
    },
  });
  return response.headers.get("x-csrf-token") || "";
}

export async function getGameLaunchTicket() {
  const cookie = await getRobloxCookie();
  const response = await fetch("https://auth.roblox.com/v1/authentication-ticket/", {
    method: "POST",
    headers: {
      referer: "https://www.roblox.com/",
      cookie: " .ROBLOSECURITY=" + cookie + ";",
      "X-CSRF-TOKEN": await getCSRFToken(),
    },
  });
  return response.headers.get("rbx-authentication-ticket") || "";
}
