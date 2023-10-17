import { environment } from "@raycast/api";
import path from "path";
import fs from "fs";
import afs from "fs/promises";
import download from "download";
import AdmZip from "adm-zip";

const cliVersion = "1.4.1";
const cliFileInfo = {
  arch: "universal",
  pkg: "xcodes.zip",
};

export function xcodesCLIDirectory(): string {
  return path.join(environment.supportPath, "cli");
}

export function xcodesCLIFilepath(): string {
  return path.join(xcodesCLIDirectory(), "xcodes");
}

export async function ensureCLI() {
  const cli = xcodesCLIFilepath();
  if (fs.existsSync(cli)) {
    return cli;
  } else {
    const binaryURL = `https://github.com/XcodesOrg/xcodes/releases/download/${cliVersion}/xcodes.zip`;
    const dir = path.join(environment.supportPath, "cli");
    const tempDir = path.join(environment.supportPath, ".tmp");
    try {
      console.log(`Downloading client at ${binaryURL}`);
      await download(binaryURL, tempDir, { filename: cliFileInfo.pkg });
    } catch (error) {
      throw Error("Could not install xcodes CLI");
    }
    try {
      const archive = path.join(tempDir, cliFileInfo.pkg);
      await afs.mkdir(dir, { recursive: true });
      // Create an instance of AdmZip
      const zip = new AdmZip(archive);

      // Extract the contents to the target directory
      console.log(`Extracting client to ${dir}`);
      zip.extractAllTo(dir, /*overwrite*/ true);
    } catch (error) {
      throw new Error("Could not extract zip content of xcodes CLI");
    } finally {
      await afs.rm(tempDir, { recursive: true });
    }
    try {
      await afs.chmod(cli, "755");
    } catch (error) {
      await afs.rm(cli);
      throw Error("Could not chmod xcodes CLI");
    }
    return cli;
  }
}
