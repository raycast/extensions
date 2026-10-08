export interface Preferences {
  outputDirectory: string;
  ollamaApi: string;
}

export interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
}

export interface OllamaTagsResponse {
  models: Array<{
    name: string;
  }>;
}

export interface GeneratedMindMap {
  path: string;
  markdown: string;
}
