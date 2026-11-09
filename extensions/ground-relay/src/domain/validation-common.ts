// Kept identical in the two independently distributed extensions.
export type Check = (value: unknown) => boolean;
export const str: Check = (v) => typeof v === "string";
export const bool: Check = (v) => typeof v === "boolean";
export const uuid: Check = (v) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export const date: Check = (v) =>
  typeof v === "string" && Number.isFinite(Date.parse(v));
export const positive: Check = (v) => Number.isSafeInteger(v) && Number(v) > 0;
export const one =
  (...values: unknown[]): Check =>
  (v) =>
    values.includes(v);
export const optional =
  (check: Check): Check =>
  (v) =>
    v === undefined || check(v);
export const array =
  (check: Check): Check =>
  (v) =>
    Array.isArray(v) && v.every(check);
export const strings = array(str);
export const object =
  (shape: Record<string, Check>): Check =>
  (v) =>
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.entries(shape).every(([k, check]) =>
      check((v as Record<string, unknown>)[k]),
    );
const lanes = one(
  "source-of-record",
  "runtime",
  "authority",
  "governance",
  "human-experience",
  "legal",
  "physical",
  "financial",
  "temporal",
  "spatial",
  "provenance",
);
const source = object({
  format: one("context-handoff.v1"),
  sender: one("ground-relay", "lawful-splat"),
  id: uuid,
  rootId: uuid,
  version: positive,
  sha256: (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v),
  recordJson: str,
});
const lineage = {
  schemaVersion: one(1),
  id: uuid,
  rootId: uuid,
  version: positive,
  createdAt: date,
  supersedesId: optional(uuid),
};
export const groundDraft = object({
  title: str,
  carrierType: one("project", "person", "team", "organization", "other"),
  situation: str,
  operativeIntent: str,
  explicitRefusals: strings,
  constraints: strings,
  authorityBoundary: str,
  scopeBoundary: str,
  evidence: array(
    object({
      id: str,
      claim: str,
      sourceRef: optional(str),
      observedAt: optional(str),
      receiptBearing: bool,
    }),
  ),
  uncertainties: array(
    object({
      statement: str,
      classification: one("solid", "inferential", "unknown"),
    }),
  ),
  nextMove: str,
  nextMoveRequirements: strings,
  sourceContext: str,
  correctionReason: optional(str),
  handoff: optional(source),
});
export const groundRecord = object({
  ...lineage,
  format: one("ground-relay.packet"),
  formatVersion: one("1.0"),
  ubiquityCompatibility: one("candidate-compatible-not-admitted"),
  status: one("user-authored", "ai-candidate"),
  authorityStatus: one("advisory-no-authority-grant"),
  draft: groundDraft,
});
export const splatDraft = object({
  title: str,
  subject: str,
  sourceContext: str,
  telos: str,
  sourceTense: str,
  lifecycleState: str,
  currentRuntime: str,
  authorityGeometry: str,
  conditions: strings,
  constraints: strings,
  lanes: array(lanes),
  receipts: array(
    object({
      id: str,
      kind: one(
        "canonical-intent",
        "runtime-telemetry",
        "statement-of-record",
        "direct-observation",
        "artifact",
        "authority-grant",
        "policy",
        "cost",
        "constraint",
        "contradiction",
        "absence",
        "memory",
      ),
      content: str,
      sourceRef: optional(str),
      observedAt: optional(str),
      currentness: one("current", "historical", "unknown"),
      receiptBearing: bool,
    }),
  ),
  correctionReason: optional(str),
  handoff: optional(source),
});
const facet = object({
  statement: str,
  basisReceiptIds: strings,
  openPressure: strings,
});
export const analysis = object({
  workingCentroid: str,
  boundedClaim: str,
  scopeStatement: str,
  conformationStatus: one(
    "current",
    "mixed",
    "unverified",
    "stale",
    "intake-only",
  ),
  whyNotNarrower: str,
  facets: object({
    kat: facet,
    apo: facet,
    par: facet,
    ple: facet,
    ena: facet,
    tel: facet,
  }),
  laneFindings: array(
    object({
      lane: lanes,
      narrowing: str,
      receiptIds: strings,
      inferences: strings,
      exclusions: strings,
      openQuestions: strings,
      lawfulMovement: strings,
    }),
  ),
  possibilities: array(
    object({
      claim: str,
      disposition: one(
        "live",
        "weak-live",
        "disproven",
        "suspended",
        "deferred",
        "excluded",
        "lane-excluded",
        "localized",
        "de-considered",
      ),
      laneScope: array(lanes),
      rationale: str,
      receiptIds: strings,
      reentryConditions: strings,
    }),
  ),
  unknowns: strings,
  lawfulMoves: array(
    object({
      action: str,
      mode: one(
        "observe",
        "analyze",
        "draft",
        "stage",
        "commit",
        "external-act",
      ),
      rationale: str,
      authorityRequired: str,
      receiptsRequired: strings,
      reviewRequired: bool,
      reversible: bool,
    }),
  ),
  correction: object({
    unresolvedTensions: strings,
    falsifiers: strings,
    correctionTriggers: strings,
    nextNarrowingConditions: strings,
  }),
  normalizationWarnings: strings,
});
export const splatRecord = object({
  ...lineage,
  centerStatus: one("protected-held-open-not-computed"),
  persistence: one("ledger", "candidate-only"),
  draft: splatDraft,
  analysis,
});
