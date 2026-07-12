export const CARRIER_TYPES = [
  "project",
  "person",
  "team",
  "organization",
  "other",
] as const;

export type CarrierType = (typeof CARRIER_TYPES)[number];
export type UncertaintyClass = "solid" | "inferential" | "unknown";

export interface EvidenceItem {
  id: string;
  claim: string;
  sourceRef?: string;
  observedAt?: string;
  receiptBearing: boolean;
}

export interface TypedUncertainty {
  statement: string;
  classification: UncertaintyClass;
}

export interface GroundPacketDraft {
  title: string;
  carrierType: CarrierType;
  situation: string;
  operativeIntent: string;
  explicitRefusals: string[];
  constraints: string[];
  authorityBoundary: string;
  scopeBoundary: string;
  evidence: EvidenceItem[];
  uncertainties: TypedUncertainty[];
  nextMove: string;
  nextMoveRequirements: string[];
  sourceContext: string;
  correctionReason?: string;
}

export interface GroundPacketRecord {
  schemaVersion: 1;
  format: "ground-relay.packet";
  formatVersion: "1.0";
  ubiquityCompatibility: "candidate-compatible-not-admitted";
  id: string;
  rootId: string;
  version: number;
  createdAt: string;
  supersedesId?: string;
  status: "user-authored" | "ai-candidate";
  authorityStatus: "advisory-no-authority-grant";
  draft: GroundPacketDraft;
}

export interface GroundPacketFormValues {
  title: string;
  carrierType: CarrierType;
  situation: string;
  operativeIntent: string;
  explicitRefusals: string;
  constraints: string;
  authorityBoundary: string;
  scopeBoundary: string;
  evidence: string;
  uncertainties: string;
  nextMove: string;
  nextMoveRequirements: string;
  sourceContext: string;
}

export interface CorrectionFormValues extends GroundPacketFormValues {
  correctionReason: string;
}

export interface GroundPacketInput {
  title?: string;
  carrierType?: CarrierType;
  situation: string;
  operativeIntent?: string;
  explicitRefusals?: string[];
  constraints?: string[];
  authorityBoundary?: string;
  scopeBoundary?: string;
  evidence?: string[];
  uncertainties?: string[];
  nextMove?: string;
  nextMoveRequirements?: string[];
  sourceContext?: string;
}

export interface ContextGap {
  field: string;
  question: string;
  rationale: string;
}
