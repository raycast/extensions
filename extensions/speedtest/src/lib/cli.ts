import { environment } from "@raycast/api";
import path from "path/posix";
import fs from "fs";
import afs from "fs/promises";
import download from "download";
import { sha256FileHash } from "./utils";
import tar from "tar";

const cliVersion = "1.0.0";
const cliFileInfo = {
  arch: "x64",
  pkg: "macosx.tgz",
  sha256: "8d0af8a81e668fbf04b7676f173016976131877e9fbdcd0a396d4e6b70a5e8f4",
};

export function speedtestCLIDirectory(): string {
  return path.join(environment.supportPath, "cli");
}

export function speedtestCLIFilepath(): string {
  return path.join(speedtestCLIDirectory(), "speedtest");
}

export async function ensureCLI() {
  const cli = speedtestCLIFilepath();
  if (fs.existsSync(cli)) {
    return cli;
  } else {
    const binaryURL = `https://install.speedtest.net/app/cli/ookla-speedtest-${cliVersion}-${cliFileInfo.pkg}`;
    const dir = path.join(environment.supportPath, "cli");
    const tempDir = path.join(environment.supportPath, ".tmp");
    try {
      await download(binaryURL, tempDir, { filename: cliFileInfo.pkg });
    } catch (error) {
      throw Error("Could not installed speedtest cli");
    }
    try {
      const archive = path.join(tempDir, cliFileInfo.pkg);
      const archiveHash = await sha256FileHash(archive);
      if (archiveHash === cliFileInfo.sha256) {
        await afs.mkdir(dir, { recursive: true });
        await tar.extract({ file: archive, filter: (p) => p === "speedtest", cwd: dir });
      } else {
        throw Error("hash of archive is wrong");
      }
    } catch (error) {
      throw new Error("Could not extract tgz content of speedtest cli");
    } finally {
      await afs.rm(tempDir, { recursive: true });
    }
    try {
      await afs.chmod(cli, "755");
    } catch (error) {
      await afs.rm(cli);
      throw Error("Could not chmod speedtest cli");
    }
    return cli;
  }
}
