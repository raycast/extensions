export type ModelManager = {
  /**
   * The list of models.
   */
  models: Model[];

  /**
   * Whether the model list is loading.
   */
  isLoading: boolean;

  /**
   * The error message, if any.
   */
  error: string | undefined;

  /**
   * Revalidates the model list, ensuring it is up-to-date.
   * @returns A promise that resolves when the model list is loaded.
   */
  revalidate: () => Promise<void>;

  /**
   * Updates a model's data.
   * @param model The model to update.
   * @param newData The new data to update the model with.
   * @returns A promise that resolves when the model is updated.
   */
  updateModel: (model: Model, newData: Model) => Promise<void>;

  /**
   * Function to delete a model.
   * @param model The model to delete.
   * @returns A promise that resolves when the model is deleted.
   */
  deleteModel: (model: Model) => Promise<void>;

  /**
   * Creates a new model.
   * @param newData The new model's data.
   * @returns A promise that resolves with the new model.
   */
  createModel: (
    newData: Model & {
      [key: string]: string | boolean;
    }
  ) => Promise<false | Model>;

  /**
   * Gets the list of favorite models.
   * @returns The list of favorite models.
   */
  favorites: () => Model[];

  /**
   * Gets a dummy model with default values.
   * @returns A new dummy model object.
   */
  dummyModel: () => Model;
};

/**
 * A PromptLab custom model.
 */
export type Model = {
  /**
   * The name of the model.
   */
  name: string;

  /**
   * A brief description of the model, for personal reference.
   */
  description: string;

  /**
   * The model's API endpoint.
   */
  endpoint: string;

  /**
   * The model's API authentication type.
   */
  authType: string;

  /**
   * A valid API key for the model.
   */
  apiKey: string;

  /**
   * The model's input schema as a JSON string.
   */
  inputSchema: string;

  /**
   * The model's output schema as a JSON object key path.
   */
  outputKeyPath: string;

  /**
   * The timing of the model's output, either "sync" or "async".
   */
  outputTiming: string;

  /**
   * The maximum length of input that the model can handle.
   */
  lengthLimit: string;

  /**
   * Whether the model is a favorite model.
   */
  favorited: boolean;

  /**
   * The unique ID of the model.
   */
  id: string;

  /**
   * The Raycast icon for the model.
   */
  icon: string;

  /**
   * The Raycast color for the icon of the model.
   */
  iconColor: string;

  /**
   * The user's personal notes on the model.
   */
  notes: string;

  /**
   * Whether the model is the default model.
   */
  isDefault: boolean;

  /**
   * The temperature setting for the model.
   */
  temperature: string;
};
