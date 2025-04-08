import { v4 as uuidv4 } from "uuid";
import { Cache, LocalStorage } from "@raycast/api";
import { getSysHostFile, getSysHostFileHash } from "./file";
import {
  BackupSystemHostName,
  DefaultCacheCapacity,
  HostsCommonKey,
  State,
  SystemHostBackupKey,
  SystemHostHashKey,
} from "../const";

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
    isRemote: false,
    content: getSysHostFile(),
    ctime: new Date().getTime(),
  };
  await saveHostCommons([currentSysHost]);
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
    isRemote: false,
    content: getSysHostFile(),
    ctime: new Date().getTime(),
  };
  await LocalStorage.setItem(SystemHostBackupKey, JSON.stringify(currentSysHost));
}

export async function removeBackup() {
  await LocalStorage.removeItem(SystemHostBackupKey);
}

let cache = new Cache({ capacity: DefaultCacheCapacity });

export async function saveHostCommons(hostCommons: IHostCommon[]) {
  const hostCommonsStr = JSON.stringify(hostCommons);
  const size = Buffer.byteLength(hostCommonsStr);
  if (size / DefaultCacheCapacity > 1) {
    cache = new Cache({ capacity: DefaultCacheCapacity * Math.ceil(size / DefaultCacheCapacity) });
  }
  await LocalStorage.setItem(HostsCommonKey, hostCommonsStr);
  cache.set(HostsCommonKey, hostCommonsStr);
}

export async function getHostCommons(): Promise<IHostCommon[]> {
  let commonHosts: IHostCommon[] = [];
  const hosts = cache.get(HostsCommonKey) || (await LocalStorage.getItem(HostsCommonKey));
  if (hosts) commonHosts = JSON.parse(hosts as string);
  return commonHosts;
}

export function getHostCommonsCache(): IHostCommon[] {
  let commonHosts: IHostCommon[] = [];
  const hosts = cache.get(HostsCommonKey);
  if (hosts) commonHosts = JSON.parse(hosts as string);
  return commonHosts;
}
