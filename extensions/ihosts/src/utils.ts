import { State, SystemHostFilePath } from "./const";
import crypto from "node:crypto";
import fs from "node:fs";

export function convertFolders2Common(folders: IHostFolder[]): IHostCommon[] {
  const list: IHostCommon[] = [];
  folders.forEach((folder) => {
    list.push(convertFolder2Common(folder));
    list.push(...(folder.hosts?.map((host) => convertHost2Common(host, folder.state)) || []));
  });
  return list;
}

function convertFolder2Common(folder: IHostFolder): IHostCommon {
  return {
    ...folder,
    folderState: folder.state,
    isFolder: true,
  };
}

function convertHost2Common(host: IHost, folderState: State): IHostCommon {
  return {
    ...host,
    folderState: folderState,
    isFolder: false,
  };
}

export function getSysHostFileHash(): string {
  const sysHostFileBuf = fs.readFileSync(SystemHostFilePath);
  return crypto.createHash("md5").update(sysHostFileBuf).digest("hex");
}

export function getSysHostFile(): string {
  return fs.readFileSync(SystemHostFilePath, "utf8");
}
