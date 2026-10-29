import { describe, expect, it } from "vitest";
import type { DetectorEntity } from "../detector/client";
import { entitiesToSpans } from "./semantic";
import { isLuhnValid } from "./validators/luhn";

function entity(entity_type: string, text: string, value: string) {
  const start = text.indexOf(value);
  return { entity_type, start, end: start + value.length, score: 0.99 };
}

function masked(text: string, entities: DetectorEntity[]): string[] {
  return entitiesToSpans(entities, text).map((s) => text.slice(s.start, s.end));
}

/** The detector's structured pass is checksum-only. Without validation here,
 * turning the semantic layer on undoes the identifier-preservation fix. */
describe("structured spans the detector returns", () => {
  const luhnValidIdentifiers = ["1735689600005", "1234567890123452"];

  for (const value of luhnValidIdentifiers) {
    it(`recognises that ${value} passes Luhn`, () => {
      expect(isLuhnValid(value)).toBe(true);
    });

    it(`drops ${value}, reported as a card but starting like no issuer`, () => {
      const text = `ref ${value} logged`;
      expect(masked(text, [entity("CREDIT_CARD", text, value)])).toEqual([]);
    });
  }

  it("keeps a real card", () => {
    const text = "card 4111111111111111 on file";
    expect(
      masked(text, [entity("CREDIT_CARD", text, "4111111111111111")]),
    ).toEqual(["4111111111111111"]);
  });

  // The deterministic layer strips separators before validating, so a validator
  // that cannot would silently drop every spaced card the detector returns.
  it("keeps a real card written with spaces", () => {
    const text = "card 4111 1111 1111 1111 on file";
    expect(
      masked(text, [entity("CREDIT_CARD", text, "4111 1111 1111 1111")]),
    ).toEqual(["4111 1111 1111 1111"]);
  });

  it("keeps a valid IBAN and drops one that fails mod-97", () => {
    const good = "pay FR7630006000011234567890189 today";
    expect(
      masked(good, [entity("IBAN_CODE", good, "FR7630006000011234567890189")]),
    ).toEqual(["FR7630006000011234567890189"]);

    const bad = "pay FR7630006000011234567890188 today";
    expect(
      masked(bad, [entity("IBAN_CODE", bad, "FR7630006000011234567890188")]),
    ).toEqual([]);
  });

  it("drops loopback however it is spelled", () => {
    for (const value of ["127.0.0.1", "::1", "0:0:0:0:0:0:0:1"]) {
      const text = `bound to ${value} here`;
      expect(masked(text, [entity("IP_ADDRESS", text, value)])).toEqual([]);
    }
  });

  it("keeps a routable address", () => {
    const text = "prod on 10.42.0.7";
    expect(masked(text, [entity("IP_ADDRESS", text, "10.42.0.7")])).toEqual([
      "10.42.0.7",
    ]);
  });

  it("keeps the entity types it has no validator for", () => {
    const text = "Camille Rousseau in Lyon";
    expect(
      masked(text, [
        entity("PERSON", text, "Camille Rousseau"),
        entity("LOCATION", text, "Lyon"),
      ]),
    ).toEqual(["Camille Rousseau", "Lyon"]);
  });

  it("drops an unknown label and out-of-range offsets", () => {
    const text = "Camille Rousseau";
    expect(masked(text, [entity("NOT_A_LABEL", text, "Camille")])).toEqual([]);
    expect(
      entitiesToSpans(
        [{ entity_type: "PERSON", start: 0, end: 999, score: 1 }],
        text,
      ),
    ).toEqual([]);
  });
});
