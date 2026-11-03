export type OS = "windows" | "mac" | "linux";
export type Store = "steam" | "gog" | "epic" | "xbox";
export type PathTag = "save" | "config";

// A game detected on the user's machine
export interface InstalledGame {
  name: string;
  store: Store;
  storeGameId?: string; // Steam appid, GOG productId, etc.
  installPath?: string; // Full path to game install directory
  launchTarget?: string; // Store URI (steam://, shell:appsFolder\...) or executable path
  iconPath?: string; // Artwork the store left on disk; an .exe is read for its embedded icon
  storeRoot?: string; // What <root> means: the folder holding steamapps for Steam; unset = parent of installPath
}

// Raw manifest entry (as returned by js-yaml)
export interface ManifestFileWhen {
  os?: OS;
  store?: string;
}

export interface ManifestFileEntry {
  tags?: PathTag[];
  when?: ManifestFileWhen[];
}

export interface ManifestGameEntry {
  files?: Record<string, ManifestFileEntry>;
  installDir?: Record<string, Record<string, unknown>>;
  steam?: { id: number };
  gog?: { id: number };
  alias?: string[];
}

// Compact index built from manifest (one entry per when-condition per file)
export interface IndexedFile {
  template: string;
  tags: PathTag[];
  os?: OS; // undefined = any OS
  store?: string; // undefined = any store
}

export interface IndexedGame {
  steamId?: number;
  gogId?: number;
  installDirs: string[];
  files: IndexedFile[];
}

export type ManifestIndex = Record<string, IndexedGame>;

// Final resolved game with real filesystem paths
export interface ResolvedPath {
  path: string;
  exists: boolean;
  tags: PathTag[];
  os?: OS;
  store?: string;
}

export interface GameWithPaths {
  name: string;
  store: Store;
  storeGameId?: string;
  launchTarget?: string;
  iconPath?: string;
  savePaths: ResolvedPath[];
  configPaths: ResolvedPath[];
}
