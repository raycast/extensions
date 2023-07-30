export interface OllamaApiGenerateRequestBody {
  model: string;
  prompt: string;
}

export interface OllamaApiCreateRequestBody {
  name: string;
  path: string;
}

export interface OllamaApiGenerateResponseUndone {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

export interface OllamaApiGenerateResponseDone {
  model: string;
  created_at: string;
  done: boolean;
  context: number[];
  total_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}

export interface OllamaApiTagsResponse {
  models: OllamaApiTagsResponseModel[];
}

export interface OllamaApiTagsResponseModel {
  name: string;
  modified_at: string;
  size: string;
}

export interface OllamaApiGenerateResponse {
  metadata: OllamaApiGenerateResponseMetadata;
  answer: string;
  error: boolean;
}

export interface OllamaApiGenerateResponseMetadata {
  model: string;
  total_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}

export interface RaycastArgumentsOllamaAsk {
  fallbackText?: string;
  arguments: {
    query: string;
  };
  launchType: string;
  launchContext?: string;
}
