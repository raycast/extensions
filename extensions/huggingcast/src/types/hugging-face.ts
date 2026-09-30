// Non-stream types
export interface NonStreamedToken {
  choices: NonStreamedTokenChoices[];
  created: number;
  id: string;
  model: string;
  system_fingerprint: string;
  usage?: Usage;
}

interface NonStreamedTokenChoices {
  finish_reason: string;
  index: number;
  logprobs: LogProbs;
  message: MessageContent | ToolCallContent;
}

// Stream types
export interface StreamedToken {
  choices: StreamedTokenChoices[];
  created: number;
  id: string;
  model: string;
  system_fingerprint: string;
  usage?: Usage;
}

interface StreamedTokenChoices {
  finish_reason: string;
  index: number;
  logprobs: LogProbs;
  delta: MessageContent | ToolCallContent;
}

// Generic hf types
interface Usage {
  completion_tokens: number;
  prompt_tokens: number;
  total_tokens: number;
}

interface LogProbs {
  content: LogProbsContent[];
}

interface LogProbsContent {
  logprob: number;
  token: string;
  top_logprobs: TopLogProbs[];
}

interface TopLogProbs {
  logprob: number;
  token: string;
}

interface MessageContent {
  content: string;
  role: string;
}

interface ToolCallContent {
  role: string;
  tool_calls: {
    function: unknown;
    id: string;
    index: number;
    type: string;
  };
}
