export interface ScanOptions {
  root: string;
  profiles: string;
  executable: string;
  config: string;
  exclusions: string;
  includeSensitive: boolean;
}

export interface ScanRecord {
  path: string;
  size: number | null;
  activity: number | null;
  risk: "review" | "sensitive" | "unknown";
  reason?: string;
}

export interface DirectoryIdentity {
  path: string;
  dev: number;
  ino: number;
  birthtimeMs: number;
}

export interface ScanRoot {
  path: string;
  identity: DirectoryIdentity[];
}

export interface Artifact extends ScanRecord {
  identity: DirectoryIdentity[];
}

export type ScanStatus = "preparing" | "scanning" | "complete" | "canceled" | "failed";
