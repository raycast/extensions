import "openai";

declare module "openai" {
  namespace OpenAI {
    interface ChatCompletion {
      citations?: string[];
    }
    interface ChatCompletionChunk {
      citations?: string[];
    }
    interface ChatCompletionCreateParamsNonStreaming {
      search_domain_filter?: string[];
      search_recency_filter?: string;
    }
  }
}
