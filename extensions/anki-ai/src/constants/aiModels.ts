/**
 * Mapeamento dos modelos de IA disponíveis no Raycast
 * Este arquivo contém as constantes para os modelos de IA que podem ser usados na aplicação
 */

/**
 * Enum com os modelos de IA suportados pelo Raycast
 * Os valores devem corresponder aos valores esperados pela API do Raycast
 */
export enum AIModelEnum {
  // Raycast
  RAY1 = "Ray1",
  RAY1_MINI = "Ray1_mini",

  // OpenAI
  GPT3_5 = "GPT3_5",
  GPT4 = "GPT4",
  GPT4_TURBO = "GPT4_turbo",
  GPT4o = "OpenAI_GPT4o",
  GPT4o_MINI = "OpenAI_GPT4o_mini",
  O1 = "OpenAI_o1",
  O1_MINI = "OpenAI_o1_mini",
  O3_MINI = "OpenAI_o3_mini",

  // Claude
  CLAUDE3_5_HAIKU = "Claude3_5_Haiku",
  CLAUDE3_5_SONNET = "Claude3_5_Sonnet",
  CLAUDE3_7_SONNET = "Claude3_7_Sonnet",
  CLAUDE3_OPUS = "Claude3_Opus",
  CLAUDE3_SONNET = "Claude3_Sonnet",
  CLAUDE3_HAIKU = "Claude3_Haiku",

  // Perplexity
  PERPLEXITY_SONAR = "Perplexity_Sonar",
  PERPLEXITY_SONAR_PRO = "Perplexity_Sonar_Pro",
  PERPLEXITY_SONAR_REASONING = "Perplexity_Sonar_Reasoning",

  // Llama
  LLAMA3_3_70B = "Llama3_3_70B",
  LLAMA3_1_8B = "Llama3_1_8B",
  LLAMA3_70B = "Llama3_70B",
  LLAMA3_1_405B = "Llama3_1_405B",
  LLAMA3_8B = "Llama3_8B",

  // Mistral
  MIXTRAL_8X7B = "Mixtral_8x7B",
  MISTRAL_NEMO = "Mistral_Nemo",
  MISTRAL_LARGE = "Mistral_Large",
  MISTRAL_SMALL_3 = "Mistral_Small_3",
  MISTRAL_MEDIUM = "Mistral_Medium",
  MISTRAL_SMALL = "Mistral_Small",
  CODESTRAL = "Codestral",

  // DeepSeek
  DEEPSEEK_R1_DISTILL_LLAMA_70B = "DeepSeek_R1_Distill_Llama_70B",
  DEEPSEEK_R1 = "DeepSeek_R1",

  // Google
  GEMINI_1_5_FLASH = "Gemini_1_5_Flash",
  GEMINI_1_5_PRO = "Gemini_1_5_Pro",
  GEMINI_2_0_FLASH = "Gemini_2_0_Flash",
  GEMINI_2_0_FLASH_THINKING = "Gemini_2_0_Flash_Thinking",
  GEMINI_PRO = "Gemini_Pro",

  // xAI
  GROK_2 = "Grok_2",
}

/**
 * Mapeamento dos modelos de IA para os identificadores usados na API do Raycast
 */
export const AI_MODEL_MAPPING: Record<string, string> = {
  // Raycast
  RAY1: "raycast-ray1",
  RAY1_MINI: "raycast-ray1-mini",

  // OpenAI
  GPT3_5: "openai-gpt-3.5-turbo",
  GPT4: "openai-gpt-4",
  GPT4_TURBO: "openai-gpt-4-turbo",
  GPT4o: "openai-gpt-4o",
  GPT4o_MINI: "openai-gpt-4o-mini",
  O1: "openai_o1-o1",
  O1_MINI: "openai_o1-o1-mini",
  O3_MINI: "openai_o1-o3-mini",

  // Claude
  CLAUDE3_5_HAIKU: "anthropic-claude-haiku",
  CLAUDE3_5_SONNET: "anthropic-claude-sonnet",
  CLAUDE3_7_SONNET: "anthropic-claude-3-7-sonnet-latest",
  CLAUDE3_OPUS: "anthropic-claude-opus",
  CLAUDE3_SONNET: "anthropic-claude-sonnet",
  CLAUDE3_HAIKU: "anthropic-claude-haiku",

  // Perplexity
  PERPLEXITY_SONAR: "perplexity-sonar",
  PERPLEXITY_SONAR_PRO: "perplexity-sonar-pro",
  PERPLEXITY_SONAR_REASONING: "perplexity-sonar-reasoning",

  // Llama
  LLAMA3_3_70B: "groq-llama-3.3-70b-versatile",
  LLAMA3_1_8B: "groq-llama-3.1-8b-instant",
  LLAMA3_70B: "groq-llama3-70b-8192",
  LLAMA3_1_405B: "together-meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
  LLAMA3_8B: "groq-llama-3.1-8b-instant",

  // Mistral
  MIXTRAL_8X7B: "groq-mixtral-8x7b-32768",
  MISTRAL_NEMO: "mistral-open-mistral-nemo",
  MISTRAL_LARGE: "mistral-mistral-large-latest",
  MISTRAL_SMALL_3: "mistral-mistral-small-latest",
  MISTRAL_MEDIUM: "mistral-mistral-medium",
  MISTRAL_SMALL: "mistral-mistral-small-latest",
  CODESTRAL: "mistral-codestral-latest",

  // DeepSeek
  DEEPSEEK_R1_DISTILL_LLAMA_70B: "groq-deepseek-r1-distill-llama-70b",
  DEEPSEEK_R1: "together-deepseek-ai/DeepSeek-R1",

  // Google
  GEMINI_1_5_FLASH: "google-gemini-1.5-flash",
  GEMINI_1_5_PRO: "google-gemini-1.5-pro",
  GEMINI_2_0_FLASH: "google-gemini-2.0-flash",
  GEMINI_2_0_FLASH_THINKING: "google-gemini-2.0-flash-thinking",
  GEMINI_PRO: "google-gemini-pro",

  // xAI
  GROK_2: "xai-grok-2-latest",
};

/**
 * Obtém o identificador do modelo de IA para a API do Raycast
 * @param modelName Nome do modelo de IA
 * @returns Identificador do modelo para a API do Raycast ou undefined se não encontrado
 */
export function getAIModelIdentifier(modelName: string): string | undefined {
  if (!modelName) return undefined;

  // Verifica se o modelo existe diretamente no mapeamento
  if (modelName in AI_MODEL_MAPPING) {
    return AI_MODEL_MAPPING[modelName];
  }

  // Verifica se o valor do enum existe no mapeamento
  // Isso permite usar tanto AIModelEnum.GEMINI_2_0_FLASH quanto "Gemini_2_0_Flash"
  const enumKey = Object.keys(AIModelEnum).find((key) => AIModelEnum[key as keyof typeof AIModelEnum] === modelName);

  if (enumKey && enumKey in AI_MODEL_MAPPING) {
    return AI_MODEL_MAPPING[enumKey];
  }

  return undefined;
}
