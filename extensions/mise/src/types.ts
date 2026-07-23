export interface MiseInstalledVersion {
  version: string;
  install_path: string;
  installed: boolean;
  active: boolean;
  requested_version?: string;
  source?: {
    type: string;
    path: string;
  };
}

export type MiseInstalledTools = Record<string, MiseInstalledVersion[]>;

export interface MiseRemoteVersion {
  version: string;
  created_at: string;
}
