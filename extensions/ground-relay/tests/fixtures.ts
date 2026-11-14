import { randomUUID } from "node:crypto";
export function packetFixture() {
  const id = randomUUID();
  return {
    schemaVersion: 1 as const,
    format: "ground-relay.packet" as const,
    formatVersion: "1.0" as const,
    ubiquityCompatibility: "candidate-compatible-not-admitted" as const,
    id,
    rootId: id,
    version: 1,
    createdAt: "2026-11-09T00:00:00.000Z",
    status: "user-authored" as const,
    authorityStatus: "advisory-no-authority-grant" as const,
    draft: {
      title: "Website handoff",
      carrierType: "project" as const,
      situation: "Review navigation",
      operativeIntent: "Keep decisions portable",
      explicitRefusals: ["Do not publish"],
      constraints: ["Private review"],
      authorityBoundary: "Owner decides",
      scopeBoundary: "Navigation",
      evidence: [
        {
          id: "e-test",
          claim: "Prototype exists",
          observedAt: "2026-11-08",
          receiptBearing: false,
        },
      ],
      uncertainties: [
        { statement: "Accessibility open", classification: "unknown" as const },
      ],
      nextMove: "Review",
      nextMoveRequirements: ["Owner review"],
      sourceContext: "Fictional fixture",
    },
  };
}
export function splatFixture() {
  const id = randomUUID();
  const facet = {
    statement: "Unverified",
    basisReceiptIds: [],
    openPressure: [],
  };
  return {
    schemaVersion: 1 as const,
    id,
    rootId: id,
    version: 1,
    createdAt: "2026-11-09T00:00:00.000Z",
    centerStatus: "protected-held-open-not-computed" as const,
    persistence: "ledger" as const,
    draft: {
      title: "Website analysis",
      subject: "Review navigation",
      sourceContext: "Fictional fixture",
      telos: "Keep decisions portable",
      sourceTense: "2026-11-08",
      lifecycleState: "draft",
      currentRuntime: "Unknown",
      authorityGeometry: "Owner decides",
      conditions: [],
      constraints: ["Do not publish"],
      lanes: ["runtime" as const],
      receipts: [],
    },
    analysis: {
      workingCentroid: "Navigation",
      boundedClaim: "Review pending",
      scopeStatement: "Navigation only",
      conformationStatus: "intake-only" as const,
      whyNotNarrower: "No evidence",
      facets: {
        kat: facet,
        apo: facet,
        par: facet,
        ple: facet,
        ena: facet,
        tel: facet,
      },
      laneFindings: [],
      possibilities: [],
      unknowns: ["Accessibility"],
      lawfulMoves: [],
      correction: {
        unresolvedTensions: [],
        falsifiers: [],
        correctionTriggers: [],
        nextNarrowingConditions: [],
      },
      normalizationWarnings: [],
    },
  };
}
