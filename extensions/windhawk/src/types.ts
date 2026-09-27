export interface InstalledMod {
  id: string;
  version: string;
  name: string;
  author: string;
  description: string;
  enabled: boolean;
  updateAvailable: boolean;
  availableUpdateVersion: string | null;
}

export interface InstalledModDetails {
  id: string;
  metadata: {
    version: string;
    id: string;
    github: string;
    twitter: string;
    homepage: string;
    name: string;
    description: string;
    author: string;
    include: string[];
    exclude: string[];
  };
  readme: string;
  config: {
    disabled: boolean;
  };
  enabled: boolean;
  updateAvailable: boolean;
  availableUpdateVersion: string | null;
}

export interface Mod {
  id: string;
  metadata: {
    author: string;
    description: string;
    github: string;
    name: string;
    version: string;
  };
  details: {
    published: number;
    rating: number;
    updated: number;
  };
  installed: boolean;
  enabled: boolean;
  updateAvailable: boolean;
  installedVersion: string | null;
}

export interface ModDetails {
  id: string;
  version: string;
  metadata: {
    version: string;
    id: string;
    github: string;
    twitter: string;
    homepage: string;
    name: string;
    description: string;
    author: string;
    include: string[];
    exclude: string[];
  };
  readme: string;
  installed: boolean;
  enabled: boolean;
  updateAvailable: boolean;
  installedVersion: string | null;
}

export interface ModVersion {
  version: string;
  timestamp: number;
  isPreRelease: boolean;
}
