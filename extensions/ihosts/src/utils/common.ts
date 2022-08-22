import { v4 as uuidv4 } from "uuid";
import { LocalStorage } from "@raycast/api";
import { getSysHostFile, getSysHostFileHash } from "./file";
import { BackupSystemHostName, HostsCommonKey, State, SystemHostBackupKey, SystemHostHashKey } from "../const";

export function flatHostCommons(commons: IHostCommon[]): IHostCommon[] {
  const list: IHostCommon[] = [];
  commons
    .sort((a, b) => b.ctime - a.ctime)
    .sort((a, b) => (b.isFolder === a.isFolder ? 1 : -1))
    .forEach((common) => {
      list.push(common);
      if (common.isFolder) {
        list.push(...(common.hosts?.sort((a, b) => b.ctime - a.ctime) || []));
      }
    });
  return list;
}

export async function isFirstTime(): Promise<string> {
  const currentSysHost: IHostCommon = {
    id: uuidv4(),
    name: "Origin System Hosts",
    state: State.Enable,
    isFolder: false,
    content: getSysHostFile(),
    ctime: new Date().getTime(),
  };
  await LocalStorage.setItem(HostsCommonKey, JSON.stringify([currentSysHost]));
  const sysHostFileHash = getSysHostFileHash();
  await LocalStorage.setItem(SystemHostHashKey, sysHostFileHash);
  return sysHostFileHash;
}

export async function backupHostFile() {
  const currentSysHost: IHostCommon = {
    id: uuidv4(),
    name: BackupSystemHostName,
    state: State.Disable,
    isFolder: false,
    content: getSysHostFile(),
    ctime: new Date().getTime(),
  };
  await LocalStorage.setItem(SystemHostBackupKey, JSON.stringify(currentSysHost));
}

export async function removeBackup() {
  await LocalStorage.removeItem(SystemHostBackupKey);
}

export async function saveHostCommons(hostCommons: IHostCommon[]) {
  await LocalStorage.setItem(HostsCommonKey, JSON.stringify(hostCommons));
}
