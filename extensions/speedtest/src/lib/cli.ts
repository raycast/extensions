import { environment } from "@raycast/api";
import fs from "fs";
import afs from "fs/promises";
import path from "path";
import { Readable, Transform } from "stream";
import { pipeline } from "stream/promises";
import type { ReadableStream as NodeReadableStream } from "stream/web";
import { extract as extractTar } from "tar";
import extractZip from "extract-zip";

import { sha256FileHash } from "./utils";

const maxArchiveBytes = 10 * 1024 * 1024;

async function downloadCliArchive(url: string, dest: string) {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error("Could not install speedtest cli");
  }

  const contentLength = Number(response.headers.get("content-length"));
  if (contentLength > maxArchiveBytes) {
    throw new Error("Could not install speedtest cli");
  }

  let received = 0;
  const limit = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      received += chunk.length;
      if (received > maxArchiveBytes) {
        callback(new Error("archive too large"));
        return;
      }
      callback(null, chunk);
    },
  });

  await pipeline(Readable.fromWeb(response.body as NodeReadableStream), limit, fs.createWriteStream(dest));
}

const cliVersion = "1.2.0";
const cliFileInfo =
  process.platform === "win32"
    ? {
        pkg: "win64.zip",
        sha256: "13e3d888b845d301a556419e31f14ab9bff57e3f06089ef2fd3bdc9ba6841efa",
        name: "speedtest.exe",
        extract(file: string, dest: string) {
          return extractZip(file, { dir: dest });
        },
      }
    : {
        pkg: "macosx-universal.tgz",
        sha256: "c9f8192149ebc88f8699998cecab1ce144144045907ece6f53cf50877f4de66f",
        name: "speedtest",
        extract(file: string, dest: string) {
          return extractTar({ file, filter: (p) => p === "speedtest", cwd: dest });
        },
      };

export function speedtestCLIDirectory(): string {
  return path.join(environment.supportPath, "cli");
}

export function speedtestCLIFilepath(): string {
  return path.join(speedtestCLIDirectory(), cliFileInfo.name);
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
      await afs.mkdir(tempDir, { recursive: true });
      await downloadCliArchive(binaryURL, path.join(tempDir, cliFileInfo.pkg));
    } catch {
      throw Error("Could not install speedtest cli");
    }
    try {
      const archive = path.join(tempDir, cliFileInfo.pkg);
      const archiveHash = await sha256FileHash(archive);
      if (archiveHash === cliFileInfo.sha256) {
        await afs.mkdir(dir, { recursive: true });
        await cliFileInfo.extract(archive, dir);
      } else {
        throw Error("hash of archive is wrong");
      }
    } catch {
      throw new Error("Could not extract tgz content of speedtest cli");
    } finally {
      await afs.rm(tempDir, { recursive: true });
    }
    try {
      await afs.chmod(cli, "755");
    } catch {
      await afs.rm(cli);
      throw Error("Could not chmod speedtest cli");
    }

    return cli;
  }
}
