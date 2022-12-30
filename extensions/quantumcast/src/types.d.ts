/**
 * Interface definition for Whitepaper
 */
export interface Whitepaper {
  name: string;
  system: boolean;
}

/**
 * Interface definition for Filestore Mapping
 */
export interface FilestoreMapping {
  name: string;
  path: string;
}

/**
 * Interface definition for Collection
 */
export interface Collection {
  name: string;
  type: string;
}

/**
 * Interface definition for File
 */
export interface File {
  _id?: string,
  cloudflow: {
    file: string;
    enclosing_folder: string;
  };
  document_name: string;
  file_name: string;
  path: string[];
  filetype: string;
  file_extension: string;
  url: string;
}

/**
 * Interface definition for Folder
 */
export interface Folder {
  cloudflow: {
    folder: string;
    enclosing_folder: string;
  };
  url: string;
  path: string[];
  depth: number;
  name: string;
}

/**
 * Interface definition for Raycast Preferences
 */
export interface Preferences {
  mongoURL: string;
  mongoDB: string;
  cloudflowURL: string;
  showSystemWhitepaper: boolean;
  cloudflowInstallationURI: string;
  packzManualLanguage: string;
  tracColumns: string;
  tracStates: string;
  userEmail: string;
  tracGrouping: string;
  tracOrderColumn: string;
  tracOrderColumnDescending: boolean;
}

/**
 * Interface definition for Custom Object
 */
export interface CustomCollection {
  collectionName: string;
}

/**
 * Interface definition for Workspace
 */
export interface Workspace {
  name: string;
  url: string;
}

/**
 * Interface definition for Workspace
 */
export interface MarsApp {
  name: string;
  version: string;
  description: string;
  you_are_owner?: boolean;
  owner?: string;
  documentation?: string;
  landingPage?: string;
  icon?: string;
  minCloudflowVersion?: string;
  environments?: string[];
}
