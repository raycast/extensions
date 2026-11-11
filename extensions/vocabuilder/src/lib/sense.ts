import { Translation, WordSense } from "./types";

/**
 * Single place where a Gemini sense becomes a storable `Translation`. Both the
 * sense picker's preview rows and the commit path go through it, so a new
 * dictionary field is carried to history by adding it here once.
 */
export function translationFromSense(word: string, sense: WordSense, id: string, timestamp: number): Translation {
  return {
    id,
    word,
    translation: sense.translation,
    partOfSpeech: sense.partOfSpeech,
    example: sense.example,
    exampleTranslation: sense.exampleTranslation,
    timestamp,
    type: "word",
    ...(sense.transcription !== undefined ? { transcription: sense.transcription } : {}),
    ...(sense.forms !== undefined ? { forms: sense.forms } : {}),
    ...(sense.register !== undefined ? { register: sense.register } : {}),
  };
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  const base: WordSense = {
    translation: "захоплення",
    partOfSpeech: "noun",
    example: "Вона слухала із захопленням.",
    exampleTranslation: "She listened with rapture.",
  };

  describe("translationFromSense", () => {
    it("carries the dictionary fields from a sense onto the stored translation", () => {
      const stored = translationFromSense(
        "rapture",
        { ...base, transcription: "ˈræptʃə(r)", forms: "pl. raptures", register: "literary" },
        "rapture-1",
        1700000000000,
      );
      expect(stored).toMatchObject({
        transcription: "ˈræptʃə(r)",
        forms: "pl. raptures",
        register: "literary",
      });
    });

    // Absent must mean absent, not `undefined`: history rows are round-tripped
    // through JSON.stringify, and an explicit `undefined` would be dropped
    // there anyway — keeping the key off avoids a stored/in-memory mismatch.
    it("omits dictionary keys entirely when the sense has none", () => {
      const stored = translationFromSense("rapture", base, "rapture-1", 1700000000000);
      expect("transcription" in stored).toBe(false);
      expect("forms" in stored).toBe(false);
      expect("register" in stored).toBe(false);
    });
  });
}
