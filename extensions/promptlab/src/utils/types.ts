export interface ExtensionPreferences {
  pdfOCR: boolean;
}

/**
 * User-customizable options for PromptLab commands.
 */
export interface CommandOptions {
  minNumFiles?: number;
  acceptedFileExtensions?: string[];
  useMetadata?: boolean;
  useSoundClassification?: boolean;
  useAudioDetails?: boolean;
  useSubjectClassification?: boolean;
  useRectangleDetection?: boolean;
  useBarcodeDetection?: boolean;
  useFaceDetection?: boolean;
  outputKind?: string;
  actionScript?: string;
  showResponse?: boolean;
}

/**
 * A PromptLab command.
 */
export interface Command {
  name: string;
  prompt: string;
  icon: string;
  iconColor?: string;
  minNumFiles?: number;
  acceptedFileExtensions?: string;
  useMetadata?: boolean;
  useSoundClassification?: boolean;
  useAudioDetails?: boolean;
  useSubjectClassification?: boolean;
  useRectangleDetection?: boolean;
  useBarcodeDetection?: boolean;
  useFaceDetection?: boolean;
  treatPDFsAsImages?: boolean;
  outputKind?: string;
  actionScript?: string;
  showResponse?: boolean;
  description?: string;
}
