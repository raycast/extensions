export type Provider = "openai" | "anthropic";

/** What happens when the model finishes. */
export type ResultMode = "preview" | "paste" | "copy";

export interface AICommand {
  id: string;
  title: string;
  /** Key of the `Icon` enum, e.g. "Wand". */
  icon: string;
  /** Prompt template. `{selection}` is replaced by the selected text. */
  prompt: string;
  provider: Provider;
  /** Model id. Empty means "use the extension default for this provider". */
  model?: string;
  mode: ResultMode;
  /** True for commands that ship with the extension. They can be edited and reset. */
  preset?: boolean;
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_MODELS: Record<Provider, string> = {
  openai: "gpt-5.6-luna",
  anthropic: "claude-haiku-4-5",
};

export const PROVIDER_LABEL: Record<Provider, string> = {
  openai: "OpenAI",
  anthropic: "Claude",
};

export const MODE_LABEL: Record<ResultMode, string> = {
  preview: "Show result, paste on Enter",
  paste: "Paste over selection right away",
  copy: "Copy to clipboard",
};
