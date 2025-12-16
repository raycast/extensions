export interface PromptArgument {
  name: string;
  description: string;
  required: boolean;
}

export interface Prompt {
  id: string;
  name: string;
  description: string;
  content: string;
  arguments: PromptArgument[];
}

export interface PromptsResponse {
  prompts: Prompt[];
}
