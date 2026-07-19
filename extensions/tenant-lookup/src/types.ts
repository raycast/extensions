export interface Tenant {
  uuid: string;
  name: string;
}

export type TenantSource = "auto" | "local" | "s3";

export interface Preferences {
  source: TenantSource;
  localPath: string;
  bucket: string;
  key: string;
  region: string;
  profile: string;
}
