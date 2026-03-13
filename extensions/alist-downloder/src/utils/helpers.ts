import { promisify } from "util";
import { exec } from "child_process";
import * as crypto from "crypto";
import { AlistItem } from "./types";

const asyncExec = promisify(exec);

export class DownloadCMD {
  command: string;
  url: string;
  filename: string;

  constructor(cmdTemplate: string, url: string, filename: string) {
    this.command = cmdTemplate.replace("{url}", url).replace("{filename}", filename);
    this.url = url;
    this.filename = filename;
  }

  async execute(): Promise<boolean> {
    try {
      const { stdout, stderr } = await asyncExec(this.command);
      console.log("Command output:", stdout);
      if (stderr) {
        console.error("Command error output:", stderr);
      }
      return false;
    } catch (error) {
      console.error("Error executing download command:", error);
      return true;
    }
  }
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export const hashFunction = (data: string) => crypto.createHash("md5").update(data).digest("hex");

export const makeUnique = (data: AlistItem[]) => {
  const uniqueMap: Map<string, AlistItem> = new Map();

  data.forEach((item) => {
    const key = hashFunction(`${item.name}${item.size}${item.is_dir}${item.parent}`);
    if (!uniqueMap.has(key)) {
      item.hash = key;
      uniqueMap.set(key, item);
    }
  });

  return Array.from(uniqueMap.values());
};
