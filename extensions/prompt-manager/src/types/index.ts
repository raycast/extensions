export interface Prompt {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly tags: readonly string[];
  readonly createdAt: number;
}

export type CreatePromptValues = Omit<Prompt, "id" | "createdAt">;
export type UpdatePromptValues = Partial<CreatePromptValues>;

export interface PromptStore {
  readonly prompts: readonly Prompt[];
  readonly isHydrated: boolean;
  readonly addPrompt: (prompt: CreatePromptValues) => void;
  readonly updatePrompt: (id: string, prompt: CreatePromptValues) => void;
  readonly removePrompt: (id: string) => void;
  readonly setHydrated: (state: boolean) => void;
}
