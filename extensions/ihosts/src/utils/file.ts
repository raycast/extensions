import { getPreferenceValues } from "@raycast/api";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runAppleScript } from "run-applescript";
import { SystemHostFilePath, TempSystemHostFileName } from "../const";
import { execSync } from "child_process";
import { get } from "node:https";

export function getSysHostFileHash(): string {
  const sysHostFileBuf = fs.readFileSync(SystemHostFilePath);
  return crypto.createHash("md5").update(sysHostFileBuf).digest("hex");
}

export function getSysHostFile(): string {
  return fs.readFileSync(SystemHostFilePath, "utf8");
}

export function getContentFromFile(path: string): string {
  return fs.readFileSync(path, "utf8");
}

export function getContentFromUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve(data);
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
}

export async function writeSysHostFile(content: string) {
  const tempHostsPath = path.join(os.tmpdir(), TempSystemHostFileName);
  fs.writeFileSync(tempHostsPath, content, "utf8");
  checkSysHostAccess() || (await getSysHostAccess());
  execSync(`cat ${tempHostsPath} > ${SystemHostFilePath} && rm -rf ${tempHostsPath}`);
}

export function checkSysHostAccess(): boolean {
  try {
    fs.accessSync(SystemHostFilePath, fs.constants.W_OK);
    return true;
  } catch (error) {
    return false;
  }
}

export async function getSysHostAccess() {
  await runAppleScript(`do shell script "chmod 777 ${SystemHostFilePath}" with administrator privileges`);
}

export function getShowHost(content: string): string {
  if (!content) {
    return "";
  }
  return content.replaceAll("#", "\\#").replaceAll("\n", "\n\n");
}

export function exportHost(host: IHostCommon): string {
  const loc = getHostExportLocation();
  const filePath = `${loc}${path.basename(host.name)}`;
  fs.writeFileSync(filePath, host.content || "", "utf8");
  return filePath;
}

function getHostExportLocation(): string {
  const preferences: IPreferences = getPreferenceValues();
  if (preferences.exportLoc) {
    let exportLoc = preferences.exportLoc;
    if (!exportLoc.endsWith("/")) {
      exportLoc += "/";
    }
    folderExists(exportLoc);
    return exportLoc;
  }
  return `${os.homedir()}/Desktop/`;
}

function mkdir(folder: string): boolean {
  try {
    fs.mkdirSync(folder);
    return true;
  } catch (error) {
    return false;
  }
}

function folderExists(folder: string): boolean {
  try {
    const isExists = fs.statSync(folder);
    if (isExists.isDirectory()) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    const tempFolder = path.parse(folder).dir;
    const status = folderExists(tempFolder);
    if (status) {
      return mkdir(folder);
    }
    return false;
  }
}
