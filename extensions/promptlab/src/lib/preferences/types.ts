/**
 * General preferences for the entire extension.
 */
export type ExtensionPreferences = {
  /**
   * Whether to use OCR to extract text from PDFs.
   */
  pdfOCR: boolean;

  /**
   * The endpoint for a custom model.
   * @deprecated Create a model using 'Manage Models' instead.
   */
  modelEndpoint: string;

  /**
   * The API key for a custom model.
   * @deprecated Create a model using 'Manage Models' instead.
   */
  authType: string;

  /**
   * The API key for a custom model.
   * @deprecated Create a model using 'Manage Models' instead.
   */
  apiKey: string;

  /**
   * The API key for a custom model.
   * @deprecated Create a model using 'Manage Models' instead.
   */
  inputSchema: string;

  /**
   * The JSON object key path to the output key for a custom model.
   * @deprecated Create a model using 'Manage Models' instead.
   */
  outputKeyPath: string;

  /**
   * The timing of the output for a custom model, either 'async' or 'sync'.
   * @deprecated Create a model using 'Manage Models' instead.
   */
  outputTiming: string;

  /**
   * The maximum length for input to models, based on the model's context window size.
   * @deprecated Create a model using 'Manage Models' instead.
   */
  lengthLimit: string;

  /**
   * The directory to save any exported files to.
   */
  exportLocation: string;

  /**
   * The first action listed for Command Response views.
   */
  primaryAction: string;

  /**
   * Text to prepend to all prompts.
   */
  promptPrefix: string;

  /**
   * Text to append to all prompts.
   */
  promptSuffix: string;

  /**
   * Whether to include temperature in the data sent to the model.
   */
  includeTemperature: boolean;

  /**
   * The degree to which prompt trimming is applied.
   */
  condenseAmount: string;

  /**
   * Comma-separated list of files to source custom placeholders from.
   */
  customPlaceholderFiles: string;
};

/**
 * Preferences for the `My PromptLab Commands` command.
 */
export type searchPreferences = {
  groupByCategory: boolean;
};
