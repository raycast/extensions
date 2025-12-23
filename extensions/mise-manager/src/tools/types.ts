export interface MiseToolVersion {
  version: string;
  requestedVersion?: string;
  installPath?: string;
  sourcePath?: string;
  isActive: boolean;
  isInstalled: boolean;
}

export interface MiseInstalledTool {
  name: string;
  versions: MiseToolVersion[];
}

export interface MiseOutdatedTool {
  name: string;
  currentVersion: string;
  latestVersion: string;
  requestedVersion?: string;
  sourcePath?: string;
  installPath?: string;
}

export interface MisePlugin {
  name: string;
  url?: string;
}

export interface MiseRegistryEntry {
  name: string;
  identifier?: string;
  description?: string;
  url?: string;
  backends?: string[];
}

export type MiseBackend = string;

export interface MiseSetting {
  key: string;
  value: string;
  source?: string;
}

export interface MiseDoctorResult {
  activated: boolean;
  aqua?: { baked_in_registry_tools: number };
  build_info: {
    target: string;
    features: string;
    built: string;
    rust_version: string;
    profile: string;
  };
  config_files: string[];
  dirs: {
    cache: string;
    config: string;
    data: string;
    shims: string;
    state: string;
  };
  env_vars: Record<string, string>;
  ignored_config_files: string[];
  paths: string[];
  self_update_available: boolean;
  settings: Record<string, unknown>;
  shell: { name: string; version: string };
  shims_on_path: boolean;
  toolset: Record<string, { version: string }[]>;
  version: string;
}

export interface MiseTask {
  name: string;
  description?: string;
  source?: string;
  aliases?: string[];
  depends?: string[];
}
