export type ProToolsSession = {
  name: string;
  directoryPath: string;
  modifiedDate: Date;
  filePath: string;
  relativePath: string; // Path relative to search directory
  keywords: string[];
};
