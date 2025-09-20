export type ForkedExtension = {
  /** The absolute path to the extension folder. */
  folderPath: string;
  /** The folder name without `extensions/` prefix. */
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
  dependencies: Record<string, string>;
  devDependencies?: Record<string, string>;
};

export type ExtentionNameFolder = { name: string; folder: string };

export type CommitDiff = { ahead: number; behind: number };
