import type { SplatRecord } from "./peer-types";
import type { GroundPacketDraft } from "./types";
import { readHandoff } from "./handoff";
export function receiveHandoff(value: unknown): GroundPacketDraft {
  const handoff = readHandoff(value, "lawful-splat");
  const splat = JSON.parse(handoff.recordJson) as SplatRecord;
  const d = splat.draft,
    a = splat.analysis;
  return {
    title: d.title,
    carrierType: "project",
    situation: `${d.subject}\n\nAdvisory analysis (${a.conformationStatus}): ${a.boundedClaim}`,
    operativeIntent: d.telos,
    explicitRefusals: [],
    constraints: d.constraints,
    authorityBoundary: d.authorityGeometry,
    scopeBoundary: a.scopeStatement,
    evidence: d.receipts.map((r) => ({
      id: r.id,
      claim: `[${r.kind}; ${r.currentness}] ${r.content}`,
      ...(r.kind !== "memory" && r.sourceRef ? { sourceRef: r.sourceRef } : {}),
      ...(r.observedAt ? { observedAt: r.observedAt } : {}),
      receiptBearing: r.receiptBearing && r.kind !== "memory" && !!r.sourceRef,
    })),
    uncertainties: [
      {
        classification: "unknown",
        statement:
          "Imported analysis and linked sources have not been independently verified.",
      },
      ...a.unknowns.map((statement) => ({
        classification: "unknown" as const,
        statement,
      })),
    ],
    nextMove: a.lawfulMoves
      .map((m) => `[proposed ${m.mode}] ${m.action}`)
      .join("\n"),
    nextMoveRequirements: a.lawfulMoves.flatMap((m) => [
      m.authorityRequired,
      ...m.receiptsRequired,
      ...(m.reviewRequired ? ["Human review required"] : []),
    ]),
    sourceContext: `Lawful Splat ${splat.id} v${splat.version}. Advisory derivation; no authority granted.\n${d.sourceContext}`,
    handoff,
  };
}
