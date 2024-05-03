import crypto from "crypto";
import fs from "fs";
import afs from "fs/promises";
import path from "path";
import { File } from "../abstractions";

export class FsFile implements File {
  constructor(private readonly _path: string) {}

  path: File["path"] = () => this._path;

  extension: File["extension"] = () => path.extname(this._path);

  name: File["name"] = () => path.basename(this._path, this.extension());

  hash: File["hash"] = async () => {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash("sha256");
      const fileStream = fs.createReadStream(this.path());

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

  exists: File["exists"] = async () => {
    try {
      await afs.stat(this.path());
      return true;
    } catch {
      return false;
    }
  };

  stream: File["stream"] = async () => fs.createReadStream(this._path);

  nextName: File["nextName"] = (options = {}) => {
    const { extension, counter = 0 } = options;
    const dirPath = path.dirname(this._path);
    const currentExtension = path.extname(this._path);
    const baseName = path.basename(this._path, currentExtension);
    const splitted = baseName.split(" ");
    const lastPart = splitted[splitted.length - 1];
    const digitsInName = parseInt(lastPart, 10);
    const isLastPartDigits = digitsInName.toString() === lastPart && Number.isNaN(digitsInName) === false;
    const baseNameWithoutDigits = splitted.slice(0, -1).join(" ");
    const nextName = (() => {
      if (counter === 0) {
        return baseName;
      }

      if (isLastPartDigits) {
        return `${baseNameWithoutDigits} ${digitsInName + counter}`;
      }

      return `${baseName} ${counter}`;
    })();
    const nextPath = path.join(dirPath, `${nextName}${extension ?? currentExtension}`);

    if (fs.existsSync(nextPath)) {
      return this.nextName({
        extension,
        counter: counter + 1,
      });
    }

    return `${nextName}${extension ?? currentExtension}`;
  };

  write: File["write"] = (content) =>
    new Promise((resolve, reject) => {
      const dirName = path.dirname(this._path);

      if (fs.existsSync(dirName) === false) {
        fs.mkdirSync(dirName, { recursive: true });
      }

      const writer = fs.createWriteStream(this._path);
      content.pipe(writer);
      writer.on("finish", () => {
        resolve();
      });
      writer.on("error", (err) => {
        reject(err);
      });
    });

  remove: File["remove"] = async () => {
    await afs.rm(this.path());
  };
}
