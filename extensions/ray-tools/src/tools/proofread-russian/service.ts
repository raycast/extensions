import type { ProofreadingProvider, ProofreadingResult } from "./types";

export class RussianProofreadingService {
  constructor(private readonly provider: ProofreadingProvider) {}

  async check(text: string): Promise<ProofreadingResult> {
    const normalizedText = text.trim();
    if (!normalizedText) {
      throw new Error("Enter Russian text to check");
    }

    return this.provider.check(normalizedText);
  }
}
