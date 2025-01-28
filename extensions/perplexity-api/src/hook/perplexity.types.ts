import "openai";

declare module "openai" {
  export interface ChatCompletion {
    citations?: string[];
  }
  export interface ChatCompletionChunk {
    citations?: string[];
  }
}
