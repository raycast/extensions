import { describe, expect, test } from "bun:test";
import { DEFAULT_LANGUAGE, resolveLanguage } from "../languages";
import { directionTagInstruction, languagePair, targetInstruction } from "../target";
import { buildSystemPrompt, isToneId, resolveTone, TONE_IDS, TONES } from "../tones";

const indonesian = resolveLanguage("id", DEFAULT_LANGUAGE);
const pair = languagePair(DEFAULT_LANGUAGE, indonesian);

describe("tones", () => {
  test("every tone id has a matching definition", () => {
    for (const id of TONE_IDS) {
      expect(TONES[id].id).toBe(id);
    }
  });

  test.each([
    ["default", "Faithful and natural"],
    ["linkedin", "Professional and warm"],
    ["email", "Polite and structured"],
    ["chat", "Short and casual"],
  ] as const)("summarises the %s tone as %p", (tone, summary) => {
    expect(TONES[tone].summary).toBe(summary);
  });

  test("recognises only known tone ids", () => {
    expect(isToneId("linkedin")).toBe(true);
    expect(isToneId("pirate")).toBe(false);
  });

  test("resolves a known tone id and falls back for anything else", () => {
    expect(resolveTone("chat", "email")).toBe("chat");
    expect(resolveTone("pirate", "email")).toBe("email");
    expect(resolveTone(undefined, "email")).toBe("email");
  });

  test("builds a prompt with the target rule, tone instruction, and direction tag", () => {
    const prompt = buildSystemPrompt("email", pair);

    expect(prompt).toContain(targetInstruction(pair));
    expect(prompt).toContain(TONES.email.instruction);
    expect(prompt).toContain(directionTagInstruction());
  });
});

describe("meaning preservation", () => {
  test.each(TONE_IDS)("the %s prompt forbids adding, dropping, or inventing facts", (tone) => {
    const prompt = buildSystemPrompt(tone, pair);

    expect(prompt).toContain("Keep the meaning exactly");
    expect(prompt).toContain("never add, remove, or invent facts, details, or commitments");
    expect(prompt).toContain("The tone changes the wording, never the meaning");
  });

  test.each(TONE_IDS)("the %s prompt copies exact tokens unchanged", (tone) => {
    const prompt = buildSystemPrompt(tone, pair);

    for (const token of [
      "names",
      "numbers",
      "dates",
      "prices",
      "URLs",
      "email addresses",
      "@mentions",
      "#hashtags",
      "code",
    ]) {
      expect(prompt).toContain(token);
    }
    expect(prompt).toContain("exactly as written");
  });

  test.each(TONE_IDS)("the %s prompt keeps emojis, line breaks, lists, and links", (tone) => {
    expect(buildSystemPrompt(tone, pair)).toContain("Keep existing emojis, line breaks, lists, and Markdown links");
  });
});
