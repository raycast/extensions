export interface GradlePluginResponse {
  items: GradlePlugin[];
  previousPage: string | null;
  nextPage: string | null;
}

export interface GradlePlugin {
  name: string;
  description: string;
  link: string;
  tags: string[];
  releaseDate: string;
  latestVersion: string;
}

export interface GradlePluginDetail {
  name: string;
  owner: {
    avatar?: string;
    name: string;
  };
  sourceLink?: string;
  implementations: PluginImplementation[];
  selectedVersion: SelectedVersion;
  versions: Version[];
}

export type PluginType = "Kotlin" | "Groovy";

export interface PluginImplementation {
  type: PluginType;
  pluginDSL: string;
  legacyPlugin: string;
}

export interface SelectedVersion {
  name: string;
  releaseDate: string;
  description: string;
}

export interface Version {
  version: string;
  link: string;
}
