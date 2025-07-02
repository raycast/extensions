export interface PromptTemplate {
  id: number;
  prompt_name: string;
  prompt_template?: {
    messages?: Array<{
      content:
        | string
        | Array<{
            type: string;
            text?: string;
          }>;
    }>;
    content?: Array<{
      type: string;
      text: string;
    }>;
    input_variables?: string[];
    template_format?: string;
    type?: string;
  };
  messages?: Array<{
    content:
      | string
      | Array<{
          type: string;
          text?: string;
        }>;
  }>;
  input_variables?: string[];
  tags?: string[];
  metadata?: {
    model?: {
      provider: string;
      name: string;
      parameters: Record<string, unknown>;
    };
    [key: string]: unknown;
  };
  commit_message?: string;
  llm_kwargs?: Record<string, unknown>;
  version: number;
  // Propriétés dérivées pour compatibilité
  name?: string;
  template?: string;
}

export interface TemplateVariable {
  name: string;
  value: string;
  required: boolean;
}

export interface PromptLayerResponse {
  has_next: boolean;
  has_prev: boolean;
  items: PromptTemplate[];
  next_num?: number;
  prev_num?: number;
  page: number;
  pages: number;
  total: number;
}

export interface FilledPrompt {
  template: PromptTemplate;
  variables: Record<string, string>;
  filledContent: string;
}
