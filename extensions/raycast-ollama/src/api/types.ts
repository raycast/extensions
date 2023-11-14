export interface OllamaApiTagsResponse {
  models: OllamaApiTagsResponseModel[];
}

export interface OllamaApiTagsResponseModel {
  name: string;
  modified_at: string;
  size: number;
  download?: number;
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
  options?: OllamaApiGenerateOptionsRequestBody;
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

export interface OllamaApiGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaApiEmbeddingsResponse {
  embedding: number[];
}

export interface OllamaApiGenerateResponseMetadata {
  model: string;
  total_duration: number;
  load_duration: number;
  sample_count: number;
  sample_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}

export interface OllamaPromptFormat {
  promptStart: string;
  promptEnd: string;
  tagEnd: string;
}

export interface OllamaPrompt {
  prompt: string;
  tagEnd: string;
}

export interface RaycastArgumentsOllamaAsk {
  fallbackText?: string;
  arguments: {
    query: string;
  };
  launchType: string;
  launchContext?: string;
}

export interface RaycastArgumentsOllamaAskCustom {
  fallbackText?: string;
  arguments: {
    model: string;
    query: string;
  };
  launchType: string;
  launchContext?: string;
}

export interface RaycastArgumentsOllamaChatCustom {
  fallbackText?: string;
  arguments: {
    model: string;
  };
  launchType: string;
  launchContext?: string;
}

export interface RaycastArgumentsOllamaCommandCustom {
  fallbackText?: string;
  arguments: {
    model: string;
  };
  launchType: string;
  launchContext?: string;
}
