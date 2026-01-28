import { exec } from "child_process";

export function getMacOSDefaultBrowser() {
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
