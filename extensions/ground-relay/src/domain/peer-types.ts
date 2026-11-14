// Wire contract for the paired extension. Keep in sync with its domain/types.ts.
import type { Handoff } from "./handoff";
export const LANES = [
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
] as const;

export type Lane = (typeof LANES)[number];

export const RECEIPT_KINDS = [
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
] as const;

export type ReceiptKind = (typeof RECEIPT_KINDS)[number];
export type Currentness = "current" | "historical" | "unknown";
export type ConformationStatus =
  "current" | "mixed" | "unverified" | "stale" | "intake-only";

export type PossibilityDisposition =
  | "live"
  | "weak-live"
  | "disproven"
  | "suspended"
  | "deferred"
  | "excluded"
  | "lane-excluded"
  | "localized"
  | "de-considered";

export type ActionMode =
  "observe" | "analyze" | "draft" | "stage" | "commit" | "external-act";

export interface Receipt {
  id: string;
  kind: ReceiptKind;
  content: string;
  sourceRef?: string;
  observedAt?: string;
  currentness: Currentness;
  receiptBearing: boolean;
}

export interface SplatDraft {
  title: string;
  subject: string;
  sourceContext: string;
  telos: string;
  sourceTense: string;
  lifecycleState: string;
  currentRuntime: string;
  authorityGeometry: string;
  conditions: string[];
  constraints: string[];
  lanes: Lane[];
  receipts: Receipt[];
  correctionReason?: string;
  handoff?: Handoff;
}

export interface FacetReading {
  statement: string;
  basisReceiptIds: string[];
  openPressure: string[];
}

export interface SplatFacets {
  kat: FacetReading;
  apo: FacetReading;
  par: FacetReading;
  ple: FacetReading;
  ena: FacetReading;
  tel: FacetReading;
}

export interface LaneFinding {
  lane: Lane;
  narrowing: string;
  receiptIds: string[];
  inferences: string[];
  exclusions: string[];
  openQuestions: string[];
  lawfulMovement: string[];
}

export interface Possibility {
  claim: string;
  disposition: PossibilityDisposition;
  laneScope: Lane[];
  rationale: string;
  receiptIds: string[];
  reentryConditions: string[];
}

export interface LawfulMove {
  action: string;
  mode: ActionMode;
  rationale: string;
  authorityRequired: string;
  receiptsRequired: string[];
  reviewRequired: boolean;
  reversible: boolean;
}

export interface CorrectionPath {
  unresolvedTensions: string[];
  falsifiers: string[];
  correctionTriggers: string[];
  nextNarrowingConditions: string[];
}

export interface SplatAnalysis {
  workingCentroid: string;
  boundedClaim: string;
  scopeStatement: string;
  conformationStatus: ConformationStatus;
  whyNotNarrower: string;
  facets: SplatFacets;
  laneFindings: LaneFinding[];
  possibilities: Possibility[];
  unknowns: string[];
  lawfulMoves: LawfulMove[];
  correction: CorrectionPath;
  normalizationWarnings: string[];
}

export interface SplatRecord {
  schemaVersion: 1;
  id: string;
  rootId: string;
  version: number;
  supersedesId?: string;
  createdAt: string;
  centerStatus: "protected-held-open-not-computed";
  persistence: "ledger" | "candidate-only";
  analysisOrigin?: "local-intake" | "raycast-ai";
  draft: SplatDraft;
  analysis: SplatAnalysis;
}

export interface SplatFormValues {
  title: string;
  subject: string;
  sourceContext: string;
  telos: string;
  sourceTense: string;
  lifecycleState: string;
  currentRuntime: string;
  authorityGeometry: string;
  conditions: string;
  constraints: string;
  lanes: Lane[];
  receipts: string;
}

export interface CorrectionFormValues {
  correctionReason: string;
  changedConditions: string;
  newConstraints: string;
  newReceipts: string;
  sourceTense: string;
  lifecycleState: string;
  currentRuntime: string;
  authorityGeometry: string;
  lanes: Lane[];
}
