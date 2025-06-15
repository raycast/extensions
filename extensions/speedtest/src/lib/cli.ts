import { environment } from "@raycast/api";
import axios from "axios";
import fs from "fs";
import afs from "fs/promises";
import path from "path/posix";
import { extract } from "tar";
import { sha256FileHash } from "./utils";

const cliVersion = "1.2.0";
const cliFileInfo = {
  arch: "universal",
  pkg: "macosx-universal.tgz",
  sha256: "c9f8192149ebc88f8699998cecab1ce144144045907ece6f53cf50877f4de66f",
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
      const response = await axios.get(binaryURL, { responseType: "stream" });
      await afs.mkdir(tempDir, { recursive: true });
      const filePath = path.join(tempDir, cliFileInfo.pkg);
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });
    } catch (error) {
      throw Error("Could not install speedtest cli");
    }
    try {
      const archive = path.join(tempDir, cliFileInfo.pkg);
      const archiveHash = await sha256FileHash(archive);
      if (archiveHash === cliFileInfo.sha256) {
        await afs.mkdir(dir, { recursive: true });
        await extract({ file: archive, filter: (p) => p === "speedtest", cwd: dir });
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
