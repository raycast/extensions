export interface Preferences {
  ollamaResultViewInput: string;
  ollamaResultViewInputFallback: boolean;
  ollamaChatHistoryMessagesNumber: string;
  ollamaCertificateValidation: string;
  // GitHub Models preferences
  githubToken?: string;
  defaultModel?: string; // fallback if not set via command; default will be openai/gpt-4.1
}

export interface RaycastArgumentsOllamaCommandCustom {
  fallbackText?: string;
  arguments: {
    prompt: string;
    model: string;
    parameters: string;
  };
  launchType: string;
  launchContext?: string;
}

export interface RaycastArgumentsOllamaCommandTranslate {
  fallbackText?: string;
  arguments: {
    language: string;
  };
  launchType: string;
  launchContext?: string;
}

export interface RaycastImage {
  path: string;
  html: string;
  base64: string;
}
