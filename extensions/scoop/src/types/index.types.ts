export interface ScoopPackage {
  Name: string;
  Version: string;
  Source: string;
  Binaries: string;
}

export interface InstalledScoopPackage {
  Name: string;
  Version: string;
  Source: string;
  Info: string;
}

export interface OutdatedScoopPackage {
  Name: string;
  Current: string;
  Latest: string;
}

// Represents the direct JSON output from 'scoop cat'
export interface ScoopManifest {
  version: string;
  description?: string;
  homepage?: string;
  license?: string | { identifier: string; url: string };
  notes?: string | string[];
  bin?: string | string[];
}

// A more generalized interface for our UI components
export interface ScoopPackageDetails {
  Name: string;
  Version: string;
  Description?: string;
  Homepage?: string;
  License?: string;
  Notes?: string;
  Binaries?: string;
}

export interface ScoopBucket {
  Name: string;
  Source: string;
  Updated: string;
  Manifests: string;
}
