import type { useFetch } from "@raycast/utils";

export type FetchOptions<T> = Parameters<typeof useFetch<T>>[1];

export const enum PveVmStatus {
  running = "running",
  stopped = "stopped",
  paused = "paused",
}

export const enum PveVmTypes {
  qemu = "qemu",
  lxc = "lxc",
}

export type PveVm = {
  id: string;
  type: PveVmTypes;
  name: string;

  cpu: number;
  disk: number;
  mem: number;
  maxcpu: number;
  maxdisk: number;
  maxmem: number;

  diskread: number;
  diskwrite: number;
  netin: number;
  netout: number;

  node: string;
  status: PveVmStatus;
  uptime: number;
  vmid: number;
};

export type PveStorage = {
  id: string;
  disk: number;
  maxdisk: number;
  shared: number;
  content: string;
  status: string;
  plugintype: string;
  storage: string;
  node: string;
};

export type PveStorageParsed = PveStorage & {
  contentTypes: string[];
  maxdiskParsed: string;
};

export type PveStorageStatus = {
  content: string;
  type: string;
  active?: number;
  avail?: number;
  enabled?: number;
  shared?: number;
  total?: number;
  used?: number;
};

export type PveStorageContent = {
  /** The creation time (seconds since the UNIX Epoch). */
  ctime?: number;
  /** If whole backup is encrypted, value is the fingerprint or '1'  if encrypted. Only useful for the Proxmox Backup Server storage type. */
  encrypted?: string;
  /** The format identifier ('raw', 'qcow2', 'subvol', 'iso', 'tgz' ...). */
  format?: string;
  /** Optional notes. If they contain multiple lines, only the first one is returned here. */
  notes?: string;
  /** The volume identifier of parent (for linked cloned). */
  parent?: string;
  /** The protection status. Currently only supported for backups. */
  protected?: boolean;
  /** The volume size in bytes. */
  size: number;
  /** The used space in bytes. Please note that most storage plugins do not report anything useful here. */
  used?: number;
  /** The last backup verification result. Only useful for PBS storages. */
  verification?: {
    /** The last backup verification state. */
    state: string;
    /** The last backup verification UPID. */
    upid: string;
  };
  /** The associated Owner VMID. */
  vmid?: number;
  /** The volume identifier. */
  volid: string;
  /** The volume name. */
  name?: string;
  /** The volume content. */
  content?: string;
};

export type ApiResponse<T> = {
  data: T;
};

export type VmAction = {
  title: string;
  labels: {
    doing: string;
    ended: string;
  };
  func: (vm: PveVm) => Promise<unknown>;
  needConfirm?: boolean;
};

export type WithShowErrorScreen<T extends object> = T & { showErrorScreen: boolean };
export type WithData<T> = { data: T };
export type OmitData<T extends object> = Omit<T, "data">;
