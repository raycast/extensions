export type FolderForm = {
  file: string;
  output: string;
  padding: string | number;
}

export type PathError = {
  imagePath: string | undefined;
  outputPath: string | undefined;
}