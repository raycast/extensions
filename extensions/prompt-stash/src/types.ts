export interface PromptFormValues {
  title: string;
  content: string;
  tags: string[];
  isFavorite: boolean;
}

export interface Prompt extends PromptFormValues {
  id: string;
  createdAt: Date;
  updatedAt?: Date;
}

export type ErrorCallback = (error: unknown | DOMException) => void;
export type SuccessCallback = () => void;

export type UseLocalPromptsReturn = [Prompt[], boolean, () => Promise<void>];
export type UsePromptReturn = [
  (newPrompt: Prompt, onSuccess?: SuccessCallback, onError?: ErrorCallback) => Promise<void>,
  (promptId: string, onSuccess?: SuccessCallback, onError?: ErrorCallback) => Promise<void>,
  (promptId: string, updatePrompt: Prompt, onSuccess?: SuccessCallback, onError?: ErrorCallback) => Promise<void>,
];
