import afs from "fs/promises";
import { Folder } from "../abstractions";

export class FsFolder implements Folder {
  constructor(private readonly _path: string) {}

  path: Folder["path"] = () => this._path;

  createIfNotExists: Folder["createIfNotExists"] = async () => {
    await afs.mkdir(this.path(), { recursive: true });
  };

  remove: Folder["remove"] = async () => {
    await afs.rm(this.path(), { recursive: true });
  };
}
