export interface AppTags {
  [bundleIdOrPath: string]: string[];
}

export interface TagDefinition {
  id: string;
  name: string;
  color: string;
}

export interface TagDefinitions {
  [id: string]: TagDefinition;
}
