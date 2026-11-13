export interface Site {
  name: string;
  id: string;
  plan_name: string;
  // null for sites that were created but never initialized
  framework: string | null;
  region: string;
  owner: string;
  created: number;
  memberships: string;
  frozen: boolean;
}

export interface Sites {
  [key: string]: Site;
}

export interface EnvInfo {
  id: string;
  domain?: string;
  created?: number;
  locked?: boolean;
  connection_mode?: string;
  php_version?: string;
}

export interface Environments {
  [key: string]: EnvInfo;
}
