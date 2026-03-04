export type MetalFamilyId = "steel" | "stainless_steel" | "aluminum";

export interface MetalFamily {
  id: MetalFamilyId;
  label: string;
  referenceLabel: string;
}

export interface MaterialGrade {
  id: string;
  familyId: MetalFamilyId;
  label: string;
  densityKgPerM3: number;
  referenceLabel: string;
}

/* ------------------------------------------------------------------ */
/*  Profile categories (top-level UI grouping)                        */
/* ------------------------------------------------------------------ */

export type ProfileCategory = "tubes" | "bars" | "plates_sheets" | "structural";

export const PROFILE_CATEGORY_LABELS: Record<ProfileCategory, string> = {
  tubes: "Tubes",
  bars: "Bars",
  plates_sheets: "Plates & Sheets",
  structural: "Structural Profiles",
};

/* ------------------------------------------------------------------ */
/*  Profiles                                                          */
/* ------------------------------------------------------------------ */

export type ProfileId =
  | "round_bar"
  | "square_bar"
  | "flat_bar"
  | "angle"
  | "sheet"
  | "plate"
  | "chequered_plate"
  | "expanded_metal"
  | "corrugated_sheet"
  | "pipe"
  | "rectangular_tube"
  | "square_hollow"
  | "channel_upn_en"
  | "channel_upe_en"
  | "beam_ipe_en"
  | "beam_ipn_en"
  | "beam_hea_en"
  | "beam_heb_en"
  | "beam_hem_en"
  | "tee_en";

export type DimensionKey =
  | "diameter"
  | "side"
  | "width"
  | "height"
  | "thickness"
  | "outerDiameter"
  | "wallThickness"
  | "patternHeight"
  | "legA"
  | "legB";

export interface DimensionDefinition {
  key: DimensionKey;
  label: string;
  minMm: number;
  maxMm: number;
  defaultMm: number;
}

export interface StandardSizeOption {
  id: string;
  label: string;
  areaMm2: number;
  referenceLabel: string;
}

export interface ManualProfileDefinition {
  id: ProfileId;
  label: string;
  category: ProfileCategory;
  mode: "manual";
  formulaLabel: string;
  referenceLabel: string;
  dimensions: DimensionDefinition[];
}

export interface StandardProfileDefinition {
  id: ProfileId;
  label: string;
  category: ProfileCategory;
  mode: "standard";
  formulaLabel: string;
  referenceLabel: string;
  sizes: StandardSizeOption[];
}

export type ProfileDefinition =
  | ManualProfileDefinition
  | StandardProfileDefinition;
