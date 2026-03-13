export interface Site {
  site: string;
  secured?: boolean;
  url: string;
  path: string;
  phpVersion?: string;
  nodeVersion?: string;
  favorite?: boolean;
  hasDatabaseCredentials: boolean;
  env?: string;
}
