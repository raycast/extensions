export interface ExtensionPreferences {
  pdfOCR: boolean;
}

/**
 * User-customizable options for File AI commands.
 *
 * minNumFiles - The minimum number of files required for a command to run.
 * acceptedFileExtensions - The comma-separated list of extensions that the command operates on.
 * useMetadata - If true, metadata and EXIF data will be included in the AI prompt.
 * useSoundClassification - If true, the sequence of sound classification labels will be included in the AI prompt.
 * useAudioDetails - If true, the transcribed text of audio will be included in the AI prompt.
 * useSubjectClassification - If true, the image subject classification labels will be included in the AI prompt.
 * useRectangleDetection - If true, the location and size of rectangles within images will be included in the AI prompt.
 * useBarcodeDetection - If true, the payload text of barcodes, QR codes, and other computer-readable code formats will be included in the AI prompt.
 * useFaceDetection - If true, the number of faces in images will be included in the AI prompt.
 * treatPDFsAsImages - If true, text will be extract from PDFs via OCR. This slows performance but allows for analysis on more kinds of PDF content.
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
}

/**
 * A File AI command.
 */
export interface Command {
  name: string;
  prompt: string;
  icon: string;
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
}
