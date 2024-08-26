export type FolderForm = {
  file: string;
  output: string;
  padding: string | number;
  shades: boolean;
  targetFolderPath?: string;
};

export type PathError = {
  imagePath: string | undefined;
  outputPath: string | undefined;
};
