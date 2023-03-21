export interface Command {
  name: string;
  prompt: string;
  icon: string;
  minNumFiles: string;
  acceptedFileExtensions: string;
  useFileMetadata: boolean;
  useSoundClassifications: boolean;
}
