import { describe, expect, it } from "vitest";
import {
  createGroundPacket,
  draftFromInput,
  findContextGap,
  parseEvidence,
  parseUncertainties,
} from "../src/domain/packet";

describe("ground packet", () => {
  it("marks only source-linked evidence as receipt-bearing", () => {
    const [linked, memory] = parseEvidence([
      "Build passed || CI run 44 || 2026-07-12",
      "I remember the build passing",
    ]);
    expect(linked!.receiptBearing).toBe(true);
    expect(linked!.sourceRef).toBe("CI run 44");
    expect(memory!.receiptBearing).toBe(false);
  });

  it("types uncertainty without promoting untyped claims", () => {
    expect(parseUncertainties(["[solid] Repo exists", "Maybe the API works"])).toEqual([
      { classification: "solid", statement: "Repo exists" },
      { classification: "unknown", statement: "Maybe the API works" },
    ]);
  });

  it("creates an open portability record without authority", () => {
    const record = createGroundPacket(
      draftFromInput({ situation: "A project needs a handoff." }),
      { status: "ai-candidate" },
    );
    expect(record.format).toBe("ground-relay.packet");
    expect(record.ubiquityCompatibility).toBe("candidate-compatible-not-admitted");
    expect(record.authorityStatus).toBe("advisory-no-authority-grant");
    expect(record.rootId).toBe(record.id);
  });
});

describe("context gap", () => {
  it("asks for operative intent before later fields", () => {
    const gap = findContextGap(draftFromInput({ situation: "Current state is known." }));
    expect(gap.field).toBe("operativeIntent");
  });

  it("asks for correction when the initial field is complete", () => {
    const gap = findContextGap(
      draftFromInput({
        situation: "Current state",
        operativeIntent: "Ship a bounded release",
        explicitRefusals: ["No external mutation"],
        authorityBoundary: "Human review required",
        evidence: ["Build passed || CI run 44"],
        uncertainties: ["[unknown] Store review timing"],
        nextMove: "Run lint",
      }),
    );
    expect(gap.field).toBe("correction");
  });
});
