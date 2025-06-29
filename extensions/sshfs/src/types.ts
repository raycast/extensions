export interface MountPoint {
  id: string;
  name: string;
  localPath: string;
  remotePath: string;
  user: string;
  host: string;
  createdAt: string;
  password?: string; // SSH 비밀번호 (선택적, SSH 키 인증 사용시 불필요)
  // SSHFS 옵션들
  reconnect: boolean;
  serverAliveInterval: number;
  serverAliveCountMax: number;
}

export interface ActiveMount {
  device: string;
  mountPoint: string;
  type: string;
}

export interface ZombieMount {
  mountPoint: string;
  device?: string;
  pid?: number;
  status: "mount_table_only" | "process_only" | "inaccessible";
}

export const STORAGE_KEY = "sshfs-mount-points";
