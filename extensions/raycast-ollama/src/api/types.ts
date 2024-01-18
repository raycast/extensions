export interface OllamaApiVersionResponse {
  version: string;
}

export interface OllamaApiTagsResponse {
  models: OllamaApiTagsResponseModel[];
}

export interface OllamaApiShowResponse {
  license?: string;
  modelfile: string;
  parameters: string;
  template: string;
  system?: string;
  detail?: OllamaApiShowDetail;
}

export interface OllamaApiShowDetail {
  format: string;
  family: string;
  families: string[];
  parameter_size: string;
  quantization_level: string;
}

export interface OllamaApiShowModelfile {
  from: string;
  parameter: OllamaApiShowModelfileParameter;
  template: string;
  system?: string;
  adapter?: string;
  license?: string;
}

export interface OllamaApiShowModelfileParameter {
  mirostat: number;
  mirostat_eta: number;
  mirostat_tau: number;
  num_ctx: number;
  num_gqa?: number;
  num_gpu: number;
  num_thread?: number;
  repeat_last_n: number;
  repeat_penalty: number;
  temperature: number;
  seed: number;
  stop: (string | undefined)[];
  tfs_z: number;
  num_predict: number;
  top_k: number;
  top_p: number;
}

export interface OllamaApiTagsResponseModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: OllamaApiShowDetail;
}

export interface OllamaApiPullResponse {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
  error?: string;
}

export interface OllamaApiGenerateRequestBody {
  model: string;
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  stream?: boolean;
  raw?: boolean;
  format?: string;
  images?: string[];

  options?: OllamaApiGenerateOptionsRequestBody;
}

export interface OllamaApiChatRequestBody {
  model: string;
  messages: OllamaApiChatMessage[];
  stream?: boolean;
  format?: string;

  options?: OllamaApiGenerateOptionsRequestBody;
}

export interface OllamaApiChatMessage {
  role: OllamaApiChatMessageRole;
  content: string;
  images?: string[];
}

export interface OllamaApiGenerateOptionsRequestBody {
  seed?: number;
  numa?: boolean;
  num_ctx?: number;
  num_keep?: number;
  num_batch?: number;
  numgqa?: number;
  num_gpu?: number;
  main_gpu?: number;
  low_vram?: boolean;
  f16_kv?: boolean;
  logits_all?: boolean;
  vocab_only?: boolean;
  use_mmap?: boolean;
  use_mlock?: boolean;
  embedding_only?: boolean;
  rope_frequency_base?: number;
  rope_frequency_scale?: number;
  repeate_last_n?: number;
  repeat_penalty?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  temperature?: number;
  top_k?: number;
  top_p?: number;
  tfs_z?: number;
  typical_p?: number;
  mirostat?: number;
  mirostat_tau?: number;
  mirostat_eta?: number;
  penalize_newline?: boolean;
  stop?: string[];
  num_thread?: number;
}

export interface OllamaApiGenerateStats {
  model: string;
  created_at: string;

  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;

  done: boolean;
}

export interface OllamaApiGenerateResponse extends OllamaApiGenerateStats {
  response: string;
  context?: number[];
}

export interface OllamaApiChatResponse extends OllamaApiGenerateStats {
  message?: OllamaApiChatMessage;
}

export interface OllamaApiEmbeddingsResponse {
  embedding: number[];
}

export interface RaycastArgumentsOllamaCommandCustom {
  fallbackText?: string;
  arguments: {
    prompt: string;
    model?: string;
    image?: string;
  };
  launchType: string;
  launchContext?: string;
}

export interface RaycastArgumentsOllamaCommandTranslate {
  fallbackText?: string;
  arguments: {
    language: string;
  };
  launchType: string;
  launchContext?: string;
}

export interface RaycastImage {
  path: string;
  html: string;
  base64: string;
}

export interface RaycastChatMessage extends OllamaApiGenerateStats {
  tags?: string[];
  sources?: string[];
  images?: RaycastImage[];

  messages: OllamaApiChatMessage[];
}

export interface DocumentLoaderFiles {
  path: string;
  mtime?: Date;
}

export interface ChainPreferences {
  type: Chains;
  parameter?: ChainPreferencesParameter;
}

export interface ChainPreferencesParameter {
  docsNumber?: number;
}

export enum OllamaApiChatMessageRole {
  SYSTEM = "system",
  USER = "user",
  ASSISTANT = "assistant",
}

export enum Chains {
  STUFF = "Stuff",
  REFINE = "Refine",
}

export enum PromptTags {
  FILE = "/file",
  IMAGE = "/image",
}

export enum ModelType {
  GENERATE = "generate",
  EMBEDDING = "embedding",
  IMAGE = "image",
}
