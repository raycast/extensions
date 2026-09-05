import { beforeAll, describe, expect, it } from "vitest";
import { applyMasking } from "../masking/apply";
import { detectDeterministic } from "./deterministic";
import { mergeSpans } from "./merge";
import { detectSemantic, type SemanticOptions } from "./semantic";

const BASE_URL = process.env.CAVIARDE_DETECTOR_URL ?? "http://127.0.0.1:5002";

const OPTIONS: SemanticOptions = {
  baseUrl: BASE_URL,
  timeoutMs: 10_000,
  authToken: "",
  phoneRegions: ["FR"],
  maskPersons: true,
  maskLocations: true,
  maskOrganizations: true,
};

let detectorUp = false;

beforeAll(async () => {
  try {
    const response = await fetch(`${BASE_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    detectorUp = response.ok;
  } catch {
    detectorUp = false;
  }
});

/** Skipped rather than failed when the detector is down: the extension is built
 * to degrade, and so is its test suite. */
describe("live detector", () => {
  it("finds the names and places a regex cannot", async ({ skip }) => {
    if (!detectorUp) skip();

    const text =
      "Bonjour, je suis Marie Dubois du bureau de Villeurbanne. " +
      "Mon collegue Jean-Pierre Lefevre confirme le probleme.";

    const result = await detectSemantic(text, OPTIONS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const values = result.spans.map((s) => text.slice(s.start, s.end));
    expect(values).toContain("Marie Dubois");
    expect(values).toContain("Jean-Pierre Lefevre");
    expect(values).toContain("Villeurbanne");
  });

  it("masks a whole ticket end to end", async ({ skip }) => {
    if (!detectorUp) skip();

    const text =
      "Marie Dubois a Lyon signale un souci. Contact marie.dubois@acme-solutions.fr " +
      "ou 06 12 34 56 78. IBAN FR7630006000011234567890189, SIRET 12345678200010.";

    const semantic = await detectSemantic(text, OPTIONS);
    expect(semantic.ok).toBe(true);
    if (!semantic.ok) return;

    const spans = mergeSpans([...detectDeterministic(text), ...semantic.spans]);
    const { masked, counts } = applyMasking(text, spans);

    expect(masked).toContain("[PERSON_1]");
    expect(masked).toContain("[EMAIL_1]");
    expect(masked).toContain("[IBAN_1]");
    expect(masked).toContain("[SIRET_1]");
    expect(masked).not.toContain("Marie Dubois");
    expect(masked).not.toContain("acme-solutions.fr");
    expect(masked).not.toContain("12345678200010");
    expect(counts.get("PERSON")).toBe(1);
  });

  it("finds company names, which is what the detector-patch adds", async ({
    skip,
  }) => {
    if (!detectorUp) skip();

    const text =
      "Marie Dubois, responsable chez Acme Solutions SARL a Lyon, signale que " +
      "la synchronisation avec Boulangerie Martin echoue.";

    const result = await detectSemantic(text, OPTIONS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const orgs = result.spans
      .filter((s) => s.type === "ORGANIZATION")
      .map((s) => text.slice(s.start, s.end));
    expect(orgs).toContain("Acme Solutions SARL");
    expect(orgs).toContain("Boulangerie Martin");
  });

  // Team names are caught sometimes, which is over-masking and the safe
  // direction. Product and tooling names are not, which is what this asserts.
  it("leaves product and tooling names alone", async ({ skip }) => {
    if (!detectorUp) skip();

    const text =
      "Le module Module Comptable plante sur Windows avec Chrome. " +
      "L equipe Assistance Interne a reproduit le bug, voir le journal Nginx.";

    const result = await detectSemantic(text, OPTIONS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const flagged = result.spans.map((s) => text.slice(s.start, s.end));
    for (const product of ["Module Comptable", "Windows", "Chrome", "Nginx"]) {
      expect(flagged.join(" ")).not.toContain(product);
    }
  });

  it("drops the loopback the detector reports, so debug output survives", async ({
    skip,
  }) => {
    if (!detectorUp) skip();

    const text = "Local sur 127.0.0.1:5002, prod sur 10.42.0.7";
    const result = await detectSemantic(text, OPTIONS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const values = result.spans.map((s) => text.slice(s.start, s.end));
    expect(values).not.toContain("127.0.0.1");
  });

  it("degrades to deterministic-only when the detector is unreachable", async () => {
    const result = await detectSemantic("Marie Dubois a Lyon", {
      ...OPTIONS,
      baseUrl: "http://127.0.0.1:1",
      timeoutMs: 1500,
    });
    expect(result).toEqual({ ok: false, reason: "unreachable" });
  });

  it("skips the semantic layer above the size cap without calling out", async () => {
    const result = await detectSemantic("x".repeat(6_001), OPTIONS);
    expect(result).toEqual({ ok: false, reason: "too-large" });
  });
});
