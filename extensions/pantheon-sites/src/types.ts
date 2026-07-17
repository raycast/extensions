export interface Site {
  name: string;
  id: string;
  plan_name: string;
  framework: string;
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
