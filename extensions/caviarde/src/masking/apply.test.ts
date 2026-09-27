import { describe, expect, it } from "vitest";
import type { EntityType, Layer, Span } from "../detection/types";
import { applyMasking } from "./apply";

function span(
  type: EntityType,
  start: number,
  end: number,
  layer: Layer = "deterministic",
): Span {
  return { type, start, end, layer };
}

describe("applyMasking", () => {
  it("replaces a single span", () => {
    const text = "write to marie@example.fr now";
    const { masked } = applyMasking(text, [span("EMAIL", 9, 25)]);
    expect(masked).toBe("write to [EMAIL_1] now");
  });

  it("keeps later offsets valid when the placeholder is longer than the value", () => {
    const text = "a@b.fr and c@d.fr";
    const { masked } = applyMasking(text, [
      span("EMAIL", 0, 6),
      span("EMAIL", 11, 17),
    ]);
    expect(masked).toBe("[EMAIL_1] and [EMAIL_2]");
  });

  it("keeps later offsets valid when the placeholder is shorter than the value", () => {
    const first = "un-tres-tres-long-email@example.fr";
    const second = "x@y.fr";
    const text = `${first} et ${second}`;
    const { masked } = applyMasking(text, [
      span("EMAIL", 0, first.length),
      span("EMAIL", text.indexOf(second), text.indexOf(second) + second.length),
    ]);
    expect(masked).toBe("[EMAIL_1] et [EMAIL_2]");
  });

  it("gives the same value the same token twice", () => {
    const text = "Marie puis Marie encore";
    const { masked, counts } = applyMasking(text, [
      span("PERSON", 0, 5, "semantic"),
      span("PERSON", 11, 16, "semantic"),
    ]);
    expect(masked).toBe("[PERSON_1] puis [PERSON_1] encore");
    expect(counts.get("PERSON")).toBe(1);
  });

  it("numbers distinct values of the same type in reading order", () => {
    const text = "Marie et Jean";
    const { masked } = applyMasking(text, [
      span("PERSON", 0, 5, "semantic"),
      span("PERSON", 9, 13, "semantic"),
    ]);
    expect(masked).toBe("[PERSON_1] et [PERSON_2]");
  });

  it("counts per type independently", () => {
    const text = "Marie a@b.fr Jean";
    const { counts } = applyMasking(text, [
      span("PERSON", 0, 5, "semantic"),
      span("EMAIL", 6, 12),
      span("PERSON", 13, 17, "semantic"),
    ]);
    expect(counts.get("PERSON")).toBe(2);
    expect(counts.get("EMAIL")).toBe(1);
  });

  it("masks a span at offset zero and one ending the text", () => {
    const text = "a@b.fr";
    const { masked } = applyMasking(text, [span("EMAIL", 0, 6)]);
    expect(masked).toBe("[EMAIL_1]");
  });

  it("counts UTF-16 offsets, so an astral emoji does not shift the cut", () => {
    const text = "🎉 Marie Dubois ici";
    const { masked } = applyMasking(text, [span("PERSON", 3, 15, "semantic")]);
    expect(masked).toBe("🎉 [PERSON_1] ici");
  });

  it("returns the text untouched when there is nothing to mask", () => {
    const text = "rien a signaler";
    const { masked, counts } = applyMasking(text, []);
    expect(masked).toBe(text);
    expect(counts.size).toBe(0);
  });
});
