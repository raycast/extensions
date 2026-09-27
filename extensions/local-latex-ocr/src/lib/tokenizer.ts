import { readFile } from "node:fs/promises";

type TokenizerJson = {
  model: { vocab: Record<string, number> };
  added_tokens?: Array<{ id: number; content: string; special?: boolean }>;
};

export class LatexTokenizer {
  private constructor(
    private readonly idToToken: Map<number, string>,
    private readonly specialTokens: Set<string>,
  ) {}

  static async fromFile(path: string): Promise<LatexTokenizer> {
    const parsed = JSON.parse(await readFile(path, "utf8")) as TokenizerJson;
    const idToToken = new Map<number, string>();
    const specialTokens = new Set<string>();
    for (const [token, id] of Object.entries(parsed.model.vocab)) idToToken.set(id, token);
    for (const token of parsed.added_tokens ?? []) {
      idToToken.set(token.id, token.content);
      if (token.special) specialTokens.add(token.content);
    }
    return new LatexTokenizer(idToToken, specialTokens);
  }

  decode(ids: number[]): string {
    const decoded = ids
      .map((id) => this.idToToken.get(id) ?? "")
      .filter((token) => !this.specialTokens.has(token))
      .join("")
      .replaceAll("Ġ", " ")
      .replaceAll("Ċ", "\n")
      .replaceAll("[EOS]", "")
      .replaceAll("[BOS]", "")
      .replaceAll("[PAD]", "")
      .replaceAll("</s>", "")
      .replaceAll("<s>", "")
      .trim();
    return decoded;
  }
}
