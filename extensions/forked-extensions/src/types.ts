export type ForkedExtension = {
  /** The folder full path */
  folderPath: string;
  /** The folder name */
  folderName: string;
  name: string;
  title: string;
  type?: string;
  description: string;
  icon: string;
  author: string;
  contributors?: string[];
  categories?: string[];
  scripts?: Record<string, string>;
  license: string;
  commands: string[];
  preferences: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

export type ExtentionNameFolder = { name: string; folder: string };

export type CommitDiff = { ahead: number; behind: number };
