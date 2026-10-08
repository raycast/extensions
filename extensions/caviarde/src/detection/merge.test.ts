import { describe, expect, it } from "vitest";
import { mergeSpans } from "./merge";
import type { EntityType, Layer, Span } from "./types";

function span(
  type: EntityType,
  start: number,
  end: number,
  layer: Layer,
): Span {
  return { type, start, end, layer };
}

describe("mergeSpans", () => {
  it("returns spans sorted by start", () => {
    const merged = mergeSpans([
      span("EMAIL", 40, 55, "deterministic"),
      span("PERSON", 5, 12, "semantic"),
      span("IBAN", 20, 47, "deterministic"),
    ]);
    expect(merged.map((s) => s.start)).toEqual([5, 20]);
  });

  it("drops a semantic span nested inside a deterministic one", () => {
    const merged = mergeSpans([
      span("EMAIL", 0, 30, "deterministic"),
      span("PERSON", 0, 12, "semantic"),
    ]);
    expect(merged).toEqual([span("EMAIL", 0, 30, "deterministic")]);
  });

  it("drops a semantic span whose end falls inside a deterministic one", () => {
    const merged = mergeSpans([
      span("EMAIL", 25, 45, "deterministic"),
      span("PERSON", 10, 30, "semantic"),
    ]);
    expect(merged).toEqual([span("EMAIL", 25, 45, "deterministic")]);
  });

  it("drops a semantic span that merely straddles a deterministic edge", () => {
    const merged = mergeSpans([
      span("EMAIL", 10, 30, "deterministic"),
      span("PERSON", 25, 40, "semantic"),
    ]);
    expect(merged).toEqual([span("EMAIL", 10, 30, "deterministic")]);
  });

  it("keeps the deterministic span even when the semantic one is longer", () => {
    const merged = mergeSpans([
      span("PERSON", 0, 50, "semantic"),
      span("EMAIL", 10, 20, "deterministic"),
    ]);
    expect(merged).toEqual([span("EMAIL", 10, 20, "deterministic")]);
  });

  it("keeps the deterministic label when both layers report the same range", () => {
    const merged = mergeSpans([
      span("PERSON", 5, 17, "semantic"),
      span("EMAIL", 5, 17, "deterministic"),
    ]);
    expect(merged).toEqual([span("EMAIL", 5, 17, "deterministic")]);
  });

  it("keeps touching spans, since the ranges are half-open", () => {
    const merged = mergeSpans([
      span("EMAIL", 0, 10, "deterministic"),
      span("PERSON", 10, 20, "semantic"),
    ]);
    expect(merged).toHaveLength(2);
  });

  it("keeps a semantic span that clears every deterministic one", () => {
    const merged = mergeSpans([
      span("EMAIL", 0, 10, "deterministic"),
      span("PERSON", 20, 32, "semantic"),
      span("IBAN", 40, 67, "deterministic"),
    ]);
    expect(merged.map((s) => s.type)).toEqual(["EMAIL", "PERSON", "IBAN"]);
  });

  it("resolves two overlapping deterministic spans in favour of the longer", () => {
    const merged = mergeSpans([
      span("CARD", 5, 19, "deterministic"),
      span("SIRET", 5, 25, "deterministic"),
    ]);
    expect(merged).toEqual([span("SIRET", 5, 25, "deterministic")]);
  });

  it("resolves overlapping semantic spans in favour of the longer", () => {
    const merged = mergeSpans([
      span("PERSON", 0, 6, "semantic"),
      span("LOCATION", 0, 18, "semantic"),
    ]);
    expect(merged).toEqual([span("LOCATION", 0, 18, "semantic")]);
  });

  it("is order-independent", () => {
    const input = [
      span("PERSON", 0, 12, "semantic"),
      span("EMAIL", 8, 30, "deterministic"),
      span("LOCATION", 35, 45, "semantic"),
    ];
    const forward = mergeSpans(input);
    const reversed = mergeSpans([...input].reverse());
    expect(forward).toEqual(reversed);
  });

  it("handles a span at offset zero and one ending at the last character", () => {
    const merged = mergeSpans([
      span("PERSON", 0, 5, "semantic"),
      span("EMAIL", 90, 100, "deterministic"),
    ]);
    expect(merged.map((s) => [s.start, s.end])).toEqual([
      [0, 5],
      [90, 100],
    ]);
  });

  it("returns an empty array for no input", () => {
    expect(mergeSpans([])).toEqual([]);
  });
});
