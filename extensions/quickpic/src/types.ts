export type QuickPicItem = {
  id: string;
  title: string;
  keywords: string[];
  originalName: string;
  relativePath: string;
  createdAt: string;
};

export type QuickPicLibrary = {
  version: 1;
  items: QuickPicItem[];
};

export type QuickPicResolvedItem = QuickPicItem & {
  filePath: string;
};

export type ImportImageInput = {
  sourcePath: string;
  title?: string;
  keywords: string[];
};
