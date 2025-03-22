import "openai";

declare module "openai" {
  namespace OpenAI {
    interface ChatCompletion {
      citations?: string[];
    }
    interface ChatCompletionChunk {
      citations?: string[];
    }
  }
}
