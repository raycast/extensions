import fs from "fs";
import afs from "fs/promises";
import path from "path";
import { File } from "../abstractions";

export class FsFile implements File {
  constructor(private readonly _path: string) {}

  path: File["path"] = () => this._path;

  extension: File["extension"] = () => path.extname(this._path);

  name: File["name"] = () => path.basename(this._path, this.extension());

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
      if (isLastPartDigits) {
        return `${baseNameWithoutDigits} (${digitsInName + counter + 1})`;
      }

      return `${baseName} (${counter + 1})`;
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

  remove: File["remove"] = async () => {
    await afs.rm(this.path());
  };
}
