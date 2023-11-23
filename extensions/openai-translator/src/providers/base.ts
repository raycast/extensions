import { generatMetadata, Prompt, PromptBuilder, promptBuilders } from "./prompt";
import { TranslateMode, TranslateQuery } from "./types";

export abstract class Provider {
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
  protected abstract doTranslate(query: TranslateQuery, prompt: Prompt): Promise<void>;

  async translate(query: TranslateQuery) {
    this.doTranslate(query, this.generatePrompt(query, promptBuilders));
  }
}
