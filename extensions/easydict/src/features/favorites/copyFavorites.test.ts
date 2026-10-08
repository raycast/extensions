import { describe, expect, it } from "vitest";

import { TranslationType } from "@/core/results/kinds";

import { copyAllText } from "./copyFavorites";
import { buildFavoriteWord } from "./model";

function favorite(word: string, paragraphs: string[]) {
  const query = { word, fromLanguage: "en", toLanguage: "zh-CHS", isWord: true };
  return buildFavoriteWord(query, [
    {
      type: TranslationType.Google,
      serviceId: "google",
      serviceLabel: "Google",
      serviceOrder: 0,
      content: { kind: "translation", query, paragraphs },
    },
  ]);
}

describe("copyAllText", () => {
  it("exports ordered words with tab-separated, comma-joined translations and empty missing columns", () => {
    expect(
      copyAllText([
        favorite("serendipity", ["机缘巧合", "意外发现"]),
        favorite("ephemeral", ["短暂"]),
        favorite("unknown", []),
      ]),
    ).toBe("serendipity\t机缘巧合, 意外发现\nephemeral\t短暂\nunknown\t");
    expect(copyAllText([])).toBe("");
  });
});
