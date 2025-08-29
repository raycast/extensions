export type ForkedExtension = {
  folderPath: string;
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
