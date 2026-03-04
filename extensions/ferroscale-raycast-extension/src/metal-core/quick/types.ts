import type { DimensionKey, ProfileId } from "../datasets/types";

export interface QuickParseIssue {
  field: string;
  code: string;
  message: string;
}

export interface QuickWeightRequest {
  profileAlias: string;
  profileId: ProfileId;
  selectedSizeId?: string;
  manualDimensionsMm: Partial<Record<DimensionKey, number>>;
  lengthMm: number;
  quantity: number;
  materialGradeId: string;
  customDensityKgPerM3?: number;
  normalizedInput: string;
}

export interface QuickWeightResult {
  profileAlias: string;
  profileId: ProfileId;
  profileLabel: string;
  selectedSizeId?: string;
  quantity: number;
  lengthMm: number;
  materialGradeId: string;
  densityKgPerM3: number;
  unitWeightKg: number;
  totalWeightKg: number;
  normalizedInput: string;
}

export type QuickParseResponse =
  | { ok: true; request: QuickWeightRequest }
  | { ok: false; issues: QuickParseIssue[] };

export type QuickWeightResponse =
  | { ok: true; result: QuickWeightResult }
  | { ok: false; issues: QuickParseIssue[] };
