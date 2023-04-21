export type ModelFormParams = {
  [key: string]: string | number | undefined;
  prompt?: string;
  role?: string;
  model?: string;
  temperature?: number;
  n?: number;
  maxToken?: string;
  presencePenalty?: number;
  system?: string;
  frequencyPenalty?: number;
  size?: string;
  index?: number;
};

export type GPTModelParams = {
  messages?: [
    {
      role: string;
      content: string;
    }
  ];
  role?: string;
  model?: string;
  temperature?: number;
  n?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
};

export type DALLEModelParams = {
  prompt?: string;
  n?: number;
  size?: string;
  response_format: string;
};

export type Models = {
  [key: string]: {
    link: string;
    model?: string;
    name?: string;
  };
};

export type ResponseType = {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  choices?: {
    message: {
      role: string;
      cotent: string;
    };
    finish_reason: string;
    index: number;
  }[];
  data?: [
    {
      url: string;
    }
  ];
  error?: {
    message: string;
    type: string;
    param: string | number | null | undefined;
    code: string;
  };
};

export type ResultType = {
  created?: number;
  choices?: {
    message?: {
      role: string;
      content: string;
    };
    finish_reason?: string;
    index?: number;
  }[];
  model?: string;
  data?: [
    {
      url: string;
    }
  ];
};

export type StorageValue = { [key: string]: string };

export type CustomPrompt = {
  [key: string]: string | number | undefined;
  name: string;
  prompt: string;
  role: string;
  index?: number;
};
export type CustomPrompts = {
  [key: string]: CustomPrompt;
};

export interface RemovePropertyResult<T> {
  storedHistory: Partial<T>;
  customPrompts: any;
}
