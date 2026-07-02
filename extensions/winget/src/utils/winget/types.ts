export interface Package {
  name: string;
  id: string;
  version: string;
  source: string;
}

export interface InstalledPackage {
  name: string;
  /** May be empty for apps not registered in the winget source (e.g. MSI-only installs). */
  id: string;
  version: string;
  /** Non-empty when a newer version is available in the winget source. */
  available?: string;
  source?: string;
}

export interface OutdatedPackage {
  name: string;
  id: string;
  version: string;
  available: string;
  source: string;
}

export interface PackageDetail {
  name: string;
  id: string;
  version: string;
  publisher?: string;
  publisherUrl?: string;
  description?: string;
  homepage?: string;
  license?: string;
  licenseUrl?: string;
  tags?: string[];
  moniker?: string;
  installerType?: string;
}
