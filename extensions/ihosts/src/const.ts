export enum HostFolderMode {
  Single = "Single",
  Multiple = "Multiple",
}

export enum State {
  Enable = "Enabled",
  Disable = "Disabled",
}

export const SystemHostHashKey = "$SystemHostHashKey$";
export const SystemHostBackupKey = "$SystemHostBackupKey$";
export const HostsCommonKey = "$HostsCommonKey$";
export const SystemHostFilePath = "/etc/hosts";
export const TempSystemHostFileName = "temp_hosts";
export const BackupSystemHostName = "BackedUp Hosts";
export const DefaultCacheCapacity = 10 * 1024 * 1024;
export const HostInactiveByFolderTip = "This item is  inactive because the current folder is disabled";
