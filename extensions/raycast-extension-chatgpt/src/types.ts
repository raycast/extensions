export type State = {
  loading: boolean
  currentPrompt: string
  chatMessages: ChatMessage[]
  selectedItemId: string
  totalTokens: number
  systemMessage: string
}

export type Preferences = {
  apiKey: string
  model: string
  temperature: string
  maxTokens: string
  stop: string
  topP: string
  frequencyPenalty: string
  presencePenalty: string
  saveMessages: boolean
  imeFix: boolean
}

export type OpenAiApiChatRequest = {
  model: string
  messages: ChatMessage[]
  temperature?: number
  top_p?: number
  stop?: string
  max_tokens?: number
  presence_penalty?: number
  frequency_penalty?: number
}

export type OpenAiApiChatResponse = {
  id: string
  created: number
  object: string
  choices: {
    index: number
    message: ChatMessage
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export type OpenAiApiError = {
  error: {
    message: string
    type: string
    // param?: string
    // code?: string
  }
}

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}
