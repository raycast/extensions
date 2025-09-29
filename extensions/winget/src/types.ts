export interface WingetPackage {
  id: string;
  name: string;
  version?: string;
  availableVersion?: string;
  source?: string;
  description?: string;
  publisher?: string;
  installLocation?: string;

  // PowerShell API specific properties
  installedVersion?: string;
  isUpdateAvailable?: boolean;
  availableVersions?: string[];
}

export interface WingetSearchResult {
  packages: WingetPackage[];
  hasMore: boolean;
}

export interface WingetListResult {
  packages: WingetPackage[];
  upgradeable: WingetPackage[];
}

export interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
}

// PowerShell API specific interfaces
export interface PowerShellPackage {
  Name: string;
  Id: string;
  InstalledVersion?: string;
  Version?: string;
  IsUpdateAvailable?: boolean;
  AvailableVersions?: string[];
  Source?: string;
}

export interface PowerShellApiResult {
  success: boolean;
  packages: PowerShellPackage[];
  error?: string;
}
