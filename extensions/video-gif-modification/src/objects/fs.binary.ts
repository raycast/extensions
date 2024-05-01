import { environment } from "@raycast/api";
import { randomUUID } from "crypto";
import afs from "fs/promises";
import path from "path";
import { Archive, Binary, File, Folder } from "../abstractions";
import { FsFile } from "./fs.file";
import { FsFolder } from "./fs.folder";
import { ZipArchive } from "./zip.archive";

export class DownloadFailedException extends Error {
  constructor() {
    super("Downloading failed");
  }
}

export class ExtractionFailedException extends Error {
  constructor() {
    super("Archive extraction failed");
  }
}

export class ValidationFailedException extends Error {
  constructor() {
    super("Binary validation failed");
  }
}

export class ModeChangingFailedException extends Error {
  constructor() {
    super("Mode changing failed");
  }
}

/**
 * Download or return path to binary.
 *
 * @todo extract hardcoded dependencies to simplify testability.
 */
export class FsBinary implements Binary {
  private readonly workingFolder: Folder;

  private readonly archiveFile: File & Archive;

  private readonly binaryFile: File;

  constructor(
    private readonly data: {
      name: string;
      sha256: string;
      url: string;
    },
    private readonly onStatusChange?: (status: string) => void,
  ) {
    this.workingFolder = new FsFolder(path.join(environment.supportPath, "cli"));
    this.binaryFile = new FsFile(path.join(this.workingFolder.path(), this.data.name));
    this.archiveFile = new ZipArchive(new FsFile(path.join(environment.supportPath, "temp", randomUUID())));
  }

  path: Binary["path"] = async () => {
    if (await this.binaryFile.exists()) {
      return this.binaryFile.path();
    }

    try {
      this.onStatusChange?.("Downloading binaries");
      await this.archiveFile.download(this.data.url);
    } catch (error) {
      console.error("Downloading ffmpeg error", error);
      throw new DownloadFailedException();
    }

    try {
      this.onStatusChange?.("Unzipping");
      await this.archiveFile.extract(this.workingFolder);
    } catch (error) {
      console.error("Extracting binary error", error);
      throw new ExtractionFailedException();
    }

    try {
      this.onStatusChange?.("Verifying");
      const isValid = await this.isValid();
      if (isValid === false) {
        throw new Error("Hash of archive is invalid");
      }
    } catch (error) {
      await this.binaryFile.remove();
      console.error("Binary verification failed", error);
      throw new ValidationFailedException();
    } finally {
      await this.archiveFile.remove();
    }

    try {
      this.onStatusChange?.("Updating binary");
      await this.makeExecutable();
    } catch (error) {
      await this.binaryFile.remove();
      throw new ModeChangingFailedException();
    }

    return this.binaryFile.path();
  };

  isValid: Binary["isValid"] = async () => {
    const binaryHash = await this.binaryFile.hash();
    return binaryHash === this.data.sha256;
  };

  makeExecutable: Binary["makeExecutable"] = async () => {
    await afs.chmod(this.binaryFile.path(), "755");
  };
}
