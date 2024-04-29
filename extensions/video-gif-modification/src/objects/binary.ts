import { environment } from "@raycast/api";
import crypto, { randomUUID } from "crypto";
import decompress from "decompress";
import fs from "fs";
import afs from "fs/promises";
import path from "path";
import { LocalFile } from "./local.file";
import { RemoteFile } from "./remote.file";

const sha256 = async (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const fileStream = fs.createReadStream(filePath);

    fileStream.on("error", (err) => {
      reject(err);
    });

    hash.once("readable", () => {
      const data = hash.digest("hex");
      resolve(data);
    });

    fileStream.pipe(hash);
  });
};

/**
 * Download or return path to binary.
 *
 * @todo extract hardcoded dependencies to simplify testability.
 */
export class Binary {
  constructor(
    private readonly data: {
      name: string;
      sha256: string;
      url: string;
    },
    private readonly onStatusChange?: (status: string) => void,
  ) {}

  path = async () => {
    const cliDir = path.join(environment.supportPath, "cli");
    const binaryPath = path.join(cliDir, this.data.name);
    const tempDir = path.join(environment.supportPath, "temp");
    const name = randomUUID();
    const tempFile = path.join(tempDir, name);

    if (fs.existsSync(binaryPath)) {
      return binaryPath;
    }

    try {
      this.onStatusChange?.("Downloading binaries");
      await new RemoteFile(this.data.url, new LocalFile(path.join(tempDir, name))).stream();
    } catch (error) {
      console.error("Downloading ffmpeg error", error);
      throw new Error("Could not installed ffmpeg cli");
    }

    try {
      this.onStatusChange?.("Unzipping");
      await afs.mkdir(cliDir, { recursive: true });
      await decompress(tempFile, cliDir);
    } catch (error) {
      console.error("Extracting binary error", error);
      throw new Error("Could not extract zip content of ffmpeg cli");
    }

    try {
      this.onStatusChange?.("Verifying");
      const binaryHash = await sha256(binaryPath);
      if (binaryHash !== this.data.sha256) {
        throw new Error("hash of archive is wrong");
      }
    } catch (error) {
      await afs.rm(cliDir, { recursive: true });
      console.error("Binary verification failed", error);
      throw new Error("Binary verification failed");
    } finally {
      await afs.rm(tempFile, { recursive: true });
    }

    try {
      this.onStatusChange?.("Updating binary");
      await afs.chmod(binaryPath, "755");
    } catch (error) {
      await afs.rm(binaryPath);
      throw new Error("Could not chmod speedtest cli");
    }

    return binaryPath;
  };
}
