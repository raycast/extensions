export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export interface SupportProvider {
  name: string;
  url: string;
}

export interface TranslationResult {
  original: string;
  translation: string;
}

export interface ollamaResponseData {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  done_reason: string;
  context: number[];
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}
