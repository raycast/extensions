export interface ZoteroItemData {
  key: string;
  version: number;
  itemType: string;
  title: string;
  creators: Array<{
    creatorType: string;
    firstName?: string;
    lastName?: string;
    name?: string;
  }>;
  date?: string;
  dateAdded?: string;
  publicationTitle?: string;
  publisher?: string;
  institution?: string;
  archive?: string;
  repository?: string;
  url?: string;
  DOI?: string;
  abstractNote?: string;
  note?: string;
  annotationText?: string;
  annotationComment?: string;
  annotationPageLabel?: string;
  notes?: string[];
  tags?: Array<{ tag: string }>;
  citationKey?: string;
  extra?: string;
  collections?: string[];
  libraryId?: number;
}

export interface ZoteroItem {
  key: string;
  version: number;
  data: ZoteroItemData;
  meta?: {
    parsedDate?: string;
  };
}

export interface ZoteroCollection {
  key: string;
  name: string;
  parentCollection?: string;
}

export interface CraftConfig {
  apiKey?: string;
  apiBaseUrl: string;
  collectionId: string;
}

export interface CraftCollectionSchemaProperty {
  name: string;
  key: string;
  type: string;
  options?: Array<
    string | { name?: string; value?: string; title?: string; label?: string }
  >;
}

export interface CraftCollectionSchema {
  contentPropDetails?: {
    name?: string;
    key?: string;
  };
  properties?: CraftCollectionSchemaProperty[];
}

export interface CraftCollectionItem {
  id: string;
  title?: string;
  properties?: Record<string, unknown>;
}
