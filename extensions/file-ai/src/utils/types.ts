export interface Command {
  name: string;
  prompt: string;
  icon: string;
  minNumFiles: string;
  acceptedFileExtensions: string;
  useMetadata: boolean;
  useAudioDetails: boolean;
  useSoundClassification: boolean;
  useSubjectClassification: boolean;
  useRectangleDetection: boolean;
  useBarcodeDetection: boolean;
  useFaceDetection: boolean;
}
