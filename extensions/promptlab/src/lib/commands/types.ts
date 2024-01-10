import { CommandConfig } from "./config/types";

/**
 * User-customizable options for PromptLab commands.
 */
export type CommandOptions = {
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
  useSaliencyAnalysis?: boolean;
  useHorizonDetection?: boolean;
  scriptKind?: string;
  temperature?: string;
  model?: string;
  setupConfig?: CommandConfig;
  useSpeech?: boolean;
  speakResponse?: boolean;
};

/**
 * A PromptLab command.
 */
export type Command = {
  /**
   * The unique ID of the command.
   */
  id: string;

  /**
   * The name of the command.
   */
  name: string;

  /**
   * The raw prompt for the command.
   */
  prompt: string;

  /**
   * The Raycast icon for the command.
   */
  icon: string;

  /**
   * The Raycast color for the icon of the command.
   */
  iconColor?: string;

  /**
   * The minimum number of files required for the command. If 0, PromptLab will not check for selected files.
   */
  minNumFiles?: string;

  /**
   * The accepted file extensions for the command. If empty, all file extensions will be accepted.
   */
  acceptedFileExtensions?: string;

  /**
   * Whether to include metadata of selected files in the data sent to the model.
   */
  useMetadata?: boolean;

  /**
   * Whether to include sound classifications of selected audio files in the data sent to the model.
   */
  useSoundClassification?: boolean;

  /**
   * Whether to include audio details (e.g. transcriptions) of selected audio files in the data sent to the model.
   */
  useAudioDetails?: boolean;

  /**
   * Whether to include subject classifications for selected images/videos in the data sent to the model.
   */
  useSubjectClassification?: boolean;

  /**
   * Whether to include rectangle detection information of selected images in the data sent to the model.
   */
  useRectangleDetection?: boolean;

  /**
   * Whether to include values of barcodes in selected images in the data sent to the model.
   */
  useBarcodeDetection?: boolean;

  /**
   * Whether to include face detection information for selected images/videos in the data sent to the model.
   */
  useFaceDetection?: boolean;

  /**
   * The response view for the command.
   */
  outputKind?: string;

  /**
   * The raw text of the action script that runs after a response is received.
   */
  actionScript?: string;

  /**
   * Whether to show the response view at all.
   */
  showResponse?: boolean;

  /**
   * A brief description of what the command does / what it outputs.
   */
  description?: string;

  /**
   * Whether to include saliency analysis information for selected images/videos in the data sent to the model.
   */
  useSaliencyAnalysis?: boolean;

  /**
   * Whether to include the angle of the horizon in selected images in the data sent to the model.
   */
  useHorizonDetection?: boolean;

  /**
   * The name of the author of the command.
   */
  author?: string;

  /**
   * A link to the author's website, or the command's website, if applicable.
   */
  website?: string;

  /**
   * The version of the command.
   */
  version?: string;

  /**
   * A list/description of any requirements for the command to work.
   */
  requirements?: string;

  /**
   * The kind of script that the {@link actionScript} is written in.
   */
  scriptKind?: string;

  /**
   * The categories that the command belongs to.
   */
  categories?: string[];

  /**
   * The temperature to use when sending data to the model.
   */
  temperature?: string;

  /**
   * The model to use for the command.
   */
  model?: string;

  /**
   * Whether the command is favorited.
   */
  favorited?: boolean;

  /**
   * The setup configuration fields for the command.
   */
  setupConfig?: CommandConfig;

  /**
   * Whether the command was installed from the store.
   */
  installedFromStore?: boolean;

  /**
   * Whether the command has its configuration fields locked.
   */
  setupLocked?: boolean;

  /**
   * Whether to use voice input for the command.
   */
  useSpeech?: boolean;

  /**
   * Whether to speak the response.
   */
  speakResponse?: boolean;

  /**
   * Whether to show the command in PromptLab's menu bar extra.
   */
  showInMenuBar?: boolean;
};

/**
 * A command response from SlashAPI.
 */
export type StoreCommand = {
  name: string;
  prompt: string;
  icon: string;
  iconColor?: string;
  minNumFiles?: string;
  acceptedFileExtensions?: string;
  useMetadata?: string;
  useSoundClassification?: string;
  useAudioDetails?: string;
  useSubjectClassification?: string;
  useRectangleDetection?: string;
  useBarcodeDetection?: string;
  useFaceDetection?: string;
  outputKind?: string;
  actionScript?: string;
  showResponse?: string;
  description?: string;
  useSaliencyAnalysis?: string;
  useHorizonDetection?: string;
  exampleOutput?: string;
  author?: string;
  website?: string;
  version?: string;
  requirements?: string;
  scriptKind?: string;
  categories?: string;
  temperature?: string;
  model?: string;
  favorited?: boolean;
  setupConfig?: string;
  useSpeech?: string;
  speakResponse?: string;
};

/**
 * Checks if an object is an installed command object.
 * @param obj The object to check.
 * @returns True if the object is an installed command, false otherwise.
 */
export const isCommand = (obj: object): obj is Command => {
  return !("exampleOutput" in obj);
};

/**
 * Checks if an object is a store command object.
 * @param obj The object to check.
 * @returns True if the object is a store command, false otherwise.
 */
export const isStoreCommand = (obj: object): obj is StoreCommand => {
  return "exampleOutput" in obj;
};
