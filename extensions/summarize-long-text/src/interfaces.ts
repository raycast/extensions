/**
 * Interface for specifying parameters needed for interacting with
 * Language Learning Models (LLM) like OpenAI and Raycast.
 *
 * @property modelName - The name of the AI model to be used.
 * @property openaiApiToken - API token for OpenAI, null if not applicable.
 * @property creativity - Controls how creative the model's responses will be.
 * @property language - Language in which the AI model should interact.
 */
export interface LLMParams {
  modelName: string;
  openaiApiToken: string | null;
  creativity: number;
  language: string;
}

/**
 * Interface for holding the response from Language Learning Models (LLM).
 *
 * @property text - The generated text from the AI model.
 * Future properties could include metrics like tokens used or accuracy.
 */
export interface LLMResponse {
  text: string;
}

export interface ModelSizes {
  [key: string]: number;
}
