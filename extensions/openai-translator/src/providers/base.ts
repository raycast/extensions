import { generatMetadata, Prompt, PromptBuilder, promptBuilders } from "./prompt";
import { ProviderProps, TranslateMode, TranslateQuery } from "./types";

export abstract class Provider {
  name: string;

  constructor(props: ProviderProps) {
    this.name = props.name;
  }

  protected generatePrompt(query: TranslateQuery, builders: Record<TranslateMode, PromptBuilder>): Prompt {
    const meta = generatMetadata(query);
    const prompt = {
      rolePrompt:
        "You are a professional translation engine, please translate the text into a colloquial, professional, elegant and fluent content, without the style of machine translation. You must only translate the text content, never interpret it.",
      commandPrompt: `Translate from ${meta.sourceLang} to ${meta.targetLang}. Only the translated text can be returned.`,
      contentPrompt: query.text,
      assistantPrompts: [],
      quoteProcessor: undefined,
      meta,
    };
    return builders[query.mode](prompt);
  }
  protected abstract doTranslate(query: TranslateQuery, prompt: Prompt): AsyncGenerator<Message>;

  async *translate(query: TranslateQuery): AsyncGenerator<Message> {
    yield* this.doTranslate(query, this.generatePrompt(query, promptBuilders));
  }
}

/**
Message has two types
finishReason: string
{ content: targetTxt, role, isWordMode }
 */
export type Message = string | { content: string; role?: string | null; isWordMode: boolean; isFullText?: boolean };
