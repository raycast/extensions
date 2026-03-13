/**
 * Represents the form data for folder customization.
 */
export type FolderForm = {
  file: string | string[];
  output: string | string[];
  padding: string | number;
  shades: boolean;
  targetFolderPath?: string;
};

/**
 * Represents errors related to image path operations.
 */
export type PathError = {
  imagePath: string | undefined;
  outputPath: string | undefined;
};

/**
 * Represents the status of a file write operation.
 */
export type FileWriteStatus = "success" | "failed";
