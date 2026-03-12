export interface Browser {
  id: string;
  name: string;
  bundleId: string;
  applicationPath: string;
  profileRootPath: string;
  icon: string;
  processName: string;
}

export interface Profile {
  id: string;
  browserId: string;
  directoryName: string;
  displayName: string;
  avatarPath: string | null;
  gaiaName: string | null;
}

export interface ProfileCache {
  profiles: Profile[];
  scannedAt: string;
}

export interface OpenProfileContext {
  browserId: string;
  profileDirectory: string;
  displayName: string;
}
