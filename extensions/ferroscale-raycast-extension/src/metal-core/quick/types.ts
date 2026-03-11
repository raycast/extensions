import type { DimensionKey, ProfileId } from "../datasets/types";
import type { CurrencyCode, PriceBasis, PriceUnit } from "../calculator/types";

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
  /** Overrides cross-section area from profile/size lookup */
  customAreaMm2?: number;
  /** Pricing — only present when the price= flag is supplied */
  unitPrice?: number;
  currency?: CurrencyCode;
  priceBasis?: PriceBasis;
  priceUnit?: PriceUnit;
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
  /** Total weight expressed in metric tonnes (÷ 1000) */
  totalWeightTonne: number;
  /** Linear density — kg per metre of length */
  linearDensityKgPerM: number;
  /** Estimated total painted surface area in m² (outer perimeter × length × qty).
   *  Only present when a perimeter can be computed for the profile. */
  surfaceAreaM2?: number;
  /** Surface area per metre of length in m²/m — companion to surfaceAreaM2 */
  linearSurfaceM2PerM?: number;
  /** Unit price amount per piece (present when price= flag was supplied) */
  unitPriceAmount?: number;
  /** Total price amount for all pieces (present when price= flag was supplied) */
  totalPriceAmount?: number;
  /** Currency code used for pricing */
  currency?: CurrencyCode;
  normalizedInput: string;
}

export type QuickParseResponse =
  | { ok: true; request: QuickWeightRequest }
  | { ok: false; issues: QuickParseIssue[] };

export type QuickWeightResponse =
  | { ok: true; result: QuickWeightResult }
  | { ok: false; issues: QuickParseIssue[] };
