import type { TranslationProvider, TranslationResult } from "./types";

export class TranslationService {
  constructor(private readonly provider: TranslationProvider) {}

  async translate(text: string): Promise<TranslationResult> {
    const normalizedText = text.trim();
    if (!normalizedText) {
      throw new Error("Enter text to translate");
    }

    return this.provider.translate(normalizedText);
  }
}
