import { toMillimeters } from "../calculator/units";
import { MATERIAL_GRADES } from "../datasets/materials";
import { getProfileById } from "../datasets/profiles";
import type {
  CurrencyCode,
  LengthUnit,
  PriceBasis,
  PriceUnit,
  UnitValue,
} from "../calculator/types";
import type {
  DimensionKey,
  ProfileId,
  StandardProfileDefinition,
} from "../datasets/types";
import type {
  QuickParseIssue,
  QuickParseResponse,
  QuickWeightRequest,
} from "./types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_GRADE_ID = "steel-s235jr";
const SUPPORTED_UNITS: LengthUnit[] = ["mm", "cm", "m", "in", "ft"];
const UNIT_SUFFIXES: LengthUnit[] = ["mm", "cm", "in", "ft", "m"];
const SUPPORTED_CURRENCIES: CurrencyCode[] = [
  "EUR",
  "USD",
  "GBP",
  "PLN",
  "BAM",
];

/* ------------------------------------------------------------------ */
/*  Alias tables                                                       */
/* ------------------------------------------------------------------ */

interface ManualAliasConfig {
  profileId: ProfileId;
  canonicalAlias: string;
}

interface StandardAliasConfig {
  profileId: ProfileId;
  canonicalAlias: string;
}

const MANUAL_ALIASES: Record<string, ManualAliasConfig> = {
  // Square Hollow Section — fully custom dimensions
  shs: { profileId: "square_hollow", canonicalAlias: "shs" },
  squarehollow: { profileId: "square_hollow", canonicalAlias: "shs" },
  // Rectangular Hollow Section — fully custom dimensions
  rhs: { profileId: "rectangular_tube", canonicalAlias: "rhs" },
  rectangular: { profileId: "rectangular_tube", canonicalAlias: "rhs" },
  // Circular Hollow Section / Pipe
  chs: { profileId: "pipe", canonicalAlias: "chs" },
  pipe: { profileId: "pipe", canonicalAlias: "chs" },
  // Bars
  rb: { profileId: "round_bar", canonicalAlias: "rb" },
  roundbar: { profileId: "round_bar", canonicalAlias: "rb" },
  sb: { profileId: "square_bar", canonicalAlias: "sb" },
  squarebar: { profileId: "square_bar", canonicalAlias: "sb" },
  fb: { profileId: "flat_bar", canonicalAlias: "fb" },
  flatbar: { profileId: "flat_bar", canonicalAlias: "fb" },
  // Manual angle (custom leg dimensions)
  angle: { profileId: "angle", canonicalAlias: "angle" },
  l: { profileId: "angle", canonicalAlias: "angle" },
  // Plates & sheets
  sheet: { profileId: "sheet", canonicalAlias: "sheet" },
  sht: { profileId: "sheet", canonicalAlias: "sheet" },
  plate: { profileId: "plate", canonicalAlias: "plate" },
  pl: { profileId: "plate", canonicalAlias: "plate" },
  chequered: { profileId: "chequered_plate", canonicalAlias: "chequered" },
  expanded: { profileId: "expanded_metal", canonicalAlias: "expanded" },
  corrugated: { profileId: "corrugated_sheet", canonicalAlias: "corrugated" },
};

const STANDARD_ALIASES: Record<string, StandardAliasConfig> = {
  // EN structural beams
  ipe: { profileId: "beam_ipe_en", canonicalAlias: "ipe" },
  ipn: { profileId: "beam_ipn_en", canonicalAlias: "ipn" },
  hea: { profileId: "beam_hea_en", canonicalAlias: "hea" },
  heb: { profileId: "beam_heb_en", canonicalAlias: "heb" },
  hem: { profileId: "beam_hem_en", canonicalAlias: "hem" },
  // EN channels
  upn: { profileId: "channel_upn_en", canonicalAlias: "upn" },
  upe: { profileId: "channel_upe_en", canonicalAlias: "upe" },
  // EN tee
  tee: { profileId: "tee_en", canonicalAlias: "tee" },
  t: { profileId: "tee_en", canonicalAlias: "tee" },
  // Standard SHS / RHS (EN 10219/10210 size tables)
  shss: { profileId: "shs_std_en", canonicalAlias: "shss" },
  shstd: { profileId: "shs_std_en", canonicalAlias: "shss" },
  rhss: { profileId: "rhs_std_en", canonicalAlias: "rhss" },
  rhstd: { profileId: "rhs_std_en", canonicalAlias: "rhss" },
  // Standard equal-leg angle (EN 10056)
  la: { profileId: "angle_std_en", canonicalAlias: "la" },
  leq: { profileId: "angle_std_en", canonicalAlias: "la" },
  stda: { profileId: "angle_std_en", canonicalAlias: "la" },
};

const MATERIAL_ALIASES: Record<string, string> = {
  // Steel
  steel: "steel-s235jr",
  s235: "steel-s235jr",
  s235jr: "steel-s235jr",
  s275: "steel-s275jr",
  s275jr: "steel-s275jr",
  s355: "steel-s355jr",
  s355jr: "steel-s355jr",
  s420: "steel-s420m",
  s420m: "steel-s420m",
  s460: "steel-s460m",
  s460m: "steel-s460m",
  // Stainless
  stainless: "stainless-304",
  inox: "stainless-304",
  aisi304: "stainless-304",
  "304": "stainless-304",
  "14301": "stainless-304",
  aisi316: "stainless-316",
  "316": "stainless-316",
  "14401": "stainless-316",
  aisi316l: "stainless-316l",
  "316l": "stainless-316l",
  "14404": "stainless-316l",
  duplex: "stainless-duplex-2205",
  "2205": "stainless-duplex-2205",
  "14462": "stainless-duplex-2205",
  // Aluminum
  alu: "al-6060",
  aluminum: "al-6060",
  aluminium: "al-6060",
  "6060": "al-6060",
  "6061": "al-6061",
  "6082": "al-6082",
  "5754": "al-5754",
  "3003": "al-3003",
  "7075": "al-7075",
  // Copper family
  copper: "cu-c11000",
  cu: "cu-c11000",
  brass: "cu-brass-cw614n",
  bronze: "cu-bronze-cw453k",
  // Titanium
  titanium: "ti-grade2",
  ti: "ti-grade2",
  tigrade2: "ti-grade2",
  tigrade5: "ti-grade5",
  ti6al4v: "ti-grade5",
  // Cast iron
  castiron: "ci-gjl-250",
  greyiron: "ci-gjl-250",
  gjl250: "ci-gjl-250",
  gjl300: "ci-gjl-300",
};

/* ------------------------------------------------------------------ */
/*  Parsed flag types                                                  */
/* ------------------------------------------------------------------ */

interface ParsedFlags {
  qty: number;
  materialGradeId: string;
  density?: number;
  unit: LengthUnit;
  /** thickness shorthand — injected into geometry parsing for flat/sheet/plate */
  thickness?: number;
  /** custom cross-section area override in mm² */
  customAreaMm2?: number;
  /** pricing */
  unitPrice?: number;
  currency?: CurrencyCode;
  priceBasis?: PriceBasis;
  priceUnit?: PriceUnit;
  unknownFlags: string[];
}

interface ParsedManualGeometry {
  manualDimensionsMm: Partial<Record<DimensionKey, number>>;
  lengthMm: number;
  canonicalSpec: string;
}

interface ParsedStandardGeometry {
  selectedSizeId: string;
  lengthMm: number;
  canonicalSpec: string;
}

/* ------------------------------------------------------------------ */
/*  Utilities                                                          */
/* ------------------------------------------------------------------ */

function createIssue(
  field: string,
  code: string,
  message: string,
): QuickParseIssue {
  return { field, code, message };
}

function normalizeAlias(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeSpec(value: string): string {
  return value
    .toLowerCase()
    .replace(/,/g, ".")
    .replace(/\u00d7/g, "x")
    .replace(/\*/g, "x")
    .replace(/\s+/g, "");
}

/** Expand flag assignment spacing so `qty =5` → `qty=5` etc. */
function normalizeFlagAssignments(value: string): string {
  return value.replace(
    /\b(qty|mat|dens|unit|price|currency|basis|area|t)\s*=\s*/gi,
    (_, key: string) => `${key.toLowerCase()}=`,
  );
}

function normalizeSizeToken(value: string): string {
  return normalizeSpec(value).replace(/[^a-z0-9.x]/g, "");
}

function parsePositiveNumber(raw: string): number | undefined {
  const parsed = Number(raw.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function extractTrailingUnit(
  raw: string,
  fallbackUnit: LengthUnit,
): { value: string; unit: LengthUnit } {
  for (const suffix of UNIT_SUFFIXES) {
    if (raw.endsWith(suffix)) {
      return { value: raw.slice(0, raw.length - suffix.length), unit: suffix };
    }
  }
  return { value: raw, unit: fallbackUnit };
}

function resolveMaterialGradeId(raw?: string): string | undefined {
  if (!raw) return DEFAULT_GRADE_ID;
  const normalized = raw.toLowerCase();
  if (MATERIAL_GRADES.some((g) => g.id === normalized)) return normalized;
  const aliasKey = normalized.replace(/[^a-z0-9.]/g, "");
  return MATERIAL_ALIASES[aliasKey];
}

function toMm(value: number, unit: LengthUnit): number {
  const uv: UnitValue = { value, unit };
  return toMillimeters(uv.value, uv.unit);
}

/* ------------------------------------------------------------------ */
/*  Fuzzy size matching — "Did you mean?"                             */
/* ------------------------------------------------------------------ */

/**
 * Extract the first contiguous number from a size token.
 * e.g. "200" → 200,  "40x4" → 40,  "100x60x5" → 100
 */
function leadingNumber(token: string): number | undefined {
  const m = token.match(/^(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : undefined;
}

/**
 * Given the raw body that failed to match any size, return up to 3 nearest
 * size labels from the profile sorted by numeric proximity.
 */
function fuzzySuggestions(
  profile: StandardProfileDefinition,
  body: string,
): string[] {
  const queryNum = leadingNumber(body);
  if (queryNum == null) {
    return profile.sizes.slice(0, 3).map((s) => s.label);
  }
  return profile.sizes
    .map((s) => ({
      label: s.label,
      dist: Math.abs((leadingNumber(normalizeSizeToken(s.id)) ?? 0) - queryNum),
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 3)
    .map((s) => s.label);
}

/* ------------------------------------------------------------------ */
/*  Flag parser                                                        */
/* ------------------------------------------------------------------ */

const KNOWN_FLAGS = [
  "qty",
  "mat",
  "dens",
  "unit",
  "price",
  "currency",
  "basis",
  "area",
  "t",
] as const;

function parseFlags(
  tokens: string[],
  issues: QuickParseIssue[],
): { positional: string[]; parsed: ParsedFlags } {
  const positional: string[] = [];
  const rawFlags: Record<string, string> = {};
  const unknownFlags: string[] = [];

  for (const token of tokens) {
    const eqIndex = token.indexOf("=");
    if (eqIndex <= 0) {
      positional.push(token);
      continue;
    }
    const key = token.slice(0, eqIndex).toLowerCase();
    const value = token.slice(eqIndex + 1);

    if (!(KNOWN_FLAGS as readonly string[]).includes(key)) {
      unknownFlags.push(key);
      continue;
    }
    rawFlags[key] = value;
  }

  /* --- qty --- */
  const qty = rawFlags.qty ? parsePositiveNumber(rawFlags.qty) : 1;
  if (!qty) {
    issues.push(
      createIssue("qty", "invalid_qty", "qty must be a positive number."),
    );
  }

  /* --- unit --- */
  const parsedUnit = rawFlags.unit?.toLowerCase() as LengthUnit | undefined;
  const unit: LengthUnit =
    parsedUnit && SUPPORTED_UNITS.includes(parsedUnit) ? parsedUnit : "mm";
  if (rawFlags.unit && !SUPPORTED_UNITS.includes(parsedUnit!)) {
    issues.push(
      createIssue(
        "unit",
        "invalid_unit",
        "unit must be one of: mm, cm, m, in, ft.",
      ),
    );
  }

  /* --- mat / dens --- */
  const materialGradeId = resolveMaterialGradeId(rawFlags.mat);
  if (rawFlags.mat && !materialGradeId) {
    issues.push(
      createIssue(
        "mat",
        "invalid_material",
        `Unknown material '${rawFlags.mat}'.`,
      ),
    );
  }

  let density: number | undefined;
  if (rawFlags.dens) {
    density = parsePositiveNumber(rawFlags.dens);
    if (!density) {
      issues.push(
        createIssue(
          "dens",
          "invalid_density",
          "dens must be a positive number in kg/m3.",
        ),
      );
    }
  }

  /* --- t= thickness shorthand --- */
  let thickness: number | undefined;
  if (rawFlags.t) {
    const extracted = extractTrailingUnit(rawFlags.t, unit);
    const v = parsePositiveNumber(extracted.value);
    if (!v) {
      issues.push(
        createIssue(
          "t",
          "invalid_thickness",
          "t must be a positive number (e.g. t=8 or t=8mm).",
        ),
      );
    } else {
      thickness = toMm(v, extracted.unit);
    }
  }

  /* --- area= custom area override --- */
  let customAreaMm2: number | undefined;
  if (rawFlags.area) {
    const v = parsePositiveNumber(rawFlags.area);
    if (!v) {
      issues.push(
        createIssue(
          "area",
          "invalid_area",
          "area must be a positive number in mm².",
        ),
      );
    } else {
      customAreaMm2 = v;
    }
  }

  /* --- price= --- */
  let unitPrice: number | undefined;
  if (rawFlags.price) {
    const v = Number(rawFlags.price.replace(",", "."));
    if (!Number.isFinite(v) || v < 0) {
      issues.push(
        createIssue(
          "price",
          "invalid_price",
          "price must be a non-negative number.",
        ),
      );
    } else {
      unitPrice = v;
    }
  }

  /* --- currency= --- */
  let currency: CurrencyCode | undefined;
  if (rawFlags.currency) {
    const upper = rawFlags.currency.toUpperCase() as CurrencyCode;
    if (SUPPORTED_CURRENCIES.includes(upper)) {
      currency = upper;
    } else {
      issues.push(
        createIssue(
          "currency",
          "invalid_currency",
          `Unknown currency '${rawFlags.currency}'. Supported: ${SUPPORTED_CURRENCIES.join(", ")}.`,
        ),
      );
    }
  }

  /* --- basis= (weight | length | piece) → PriceBasis + PriceUnit --- */
  let priceBasis: PriceBasis | undefined;
  let priceUnit: PriceUnit | undefined;
  if (rawFlags.basis) {
    const b = rawFlags.basis.toLowerCase();
    if (b === "kg" || b === "weight") {
      priceBasis = "weight";
      priceUnit = "kg";
    } else if (b === "lb") {
      priceBasis = "weight";
      priceUnit = "lb";
    } else if (b === "m" || b === "length") {
      priceBasis = "length";
      priceUnit = "m";
    } else if (b === "ft") {
      priceBasis = "length";
      priceUnit = "ft";
    } else if (b === "pc" || b === "piece") {
      priceBasis = "piece";
      priceUnit = "piece";
    } else {
      issues.push(
        createIssue(
          "basis",
          "invalid_basis",
          "basis must be: kg, lb, m, ft, or pc.",
        ),
      );
    }
  }

  return {
    positional,
    parsed: {
      qty: qty ?? 1,
      materialGradeId: materialGradeId ?? DEFAULT_GRADE_ID,
      density,
      unit,
      thickness,
      customAreaMm2,
      unitPrice,
      currency,
      priceBasis,
      priceUnit,
      unknownFlags,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Sheet / plate triplet resolver                                     */
/* ------------------------------------------------------------------ */

function resolveSheetPlateTriplet(
  profileId: ProfileId,
  values: number[],
  unit: LengthUnit,
): { width: number; thickness: number; length: number } | QuickParseIssue {
  const profile = getProfileById(profileId);
  if (!profile || profile.mode !== "manual") {
    return createIssue(
      "query",
      "invalid_profile",
      "Could not resolve sheet/plate profile constraints.",
    );
  }
  const widthDef = profile.dimensions.find((d) => d.key === "width");
  const thicknessDef = profile.dimensions.find((d) => d.key === "thickness");
  if (!widthDef || !thicknessDef) {
    return createIssue(
      "query",
      "invalid_profile",
      "Missing sheet/plate dimension rules.",
    );
  }

  const fitsWidth = (v: number) => {
    const mm = toMm(v, unit);
    return mm >= widthDef.minMm && mm <= widthDef.maxMm;
  };
  const fitsThickness = (v: number) => {
    const mm = toMm(v, unit);
    return mm >= thicknessDef.minMm && mm <= thicknessDef.maxMm;
  };

  const candidates = [
    { width: values[0], thickness: values[1], length: values[2] },
    { width: values[0], thickness: values[2], length: values[1] },
  ];
  const valid = candidates.filter(
    (c) => fitsWidth(c.width) && fitsThickness(c.thickness),
  );
  if (valid.length === 0) {
    return createIssue(
      "query",
      "invalid_sheet_plate",
      "Expected width × thickness × length or width × length × thickness.",
    );
  }
  return valid[0];
}

/* ------------------------------------------------------------------ */
/*  Manual geometry parser                                            */
/* ------------------------------------------------------------------ */

function parseManualGeometry(
  profileId: ProfileId,
  specRaw: string,
  fallbackUnit: LengthUnit,
  /** thickness value in mm pre-supplied by the t= flag */
  thicknessOverrideMm?: number,
): ParsedManualGeometry | QuickParseIssue {
  const cleanedSpec = normalizeSpec(specRaw);
  const extracted = extractTrailingUnit(cleanedSpec, fallbackUnit);
  const parts = extracted.value.split("x").filter((p) => p.length > 0);
  const numbers = parts.map(parsePositiveNumber);
  if (numbers.some((v) => v === undefined)) {
    return createIssue(
      "query",
      "invalid_dimension",
      "Dimensions must be positive numbers.",
    );
  }

  let values = numbers as number[];
  const dimensions: Partial<Record<DimensionKey, number>> = {};
  let lengthValue = 0;

  /* ---- Square Hollow Section (manual custom) ---- */
  if (profileId === "square_hollow") {
    if (values.length === 4) {
      if (Math.abs(values[0] - values[1]) > 0.0001) {
        return createIssue(
          "query",
          "invalid_shs",
          "SHS expects equal sides (a × a × t × L).",
        );
      }
      dimensions.side = toMm(values[0], extracted.unit);
      dimensions.wallThickness = toMm(values[2], extracted.unit);
      lengthValue = values[3];
    } else if (values.length === 3) {
      dimensions.side = toMm(values[0], extracted.unit);
      dimensions.wallThickness = toMm(values[1], extracted.unit);
      lengthValue = values[2];
    } else {
      return createIssue(
        "query",
        "invalid_shs",
        "SHS expects side × side × wall × length.",
      );
    }

    /* ---- Rectangular Hollow Section (manual custom) ---- */
  } else if (profileId === "rectangular_tube") {
    if (values.length !== 4) {
      return createIssue(
        "query",
        "invalid_rhs",
        "RHS expects width × height × wall × length.",
      );
    }
    dimensions.width = toMm(values[0], extracted.unit);
    dimensions.height = toMm(values[1], extracted.unit);
    dimensions.wallThickness = toMm(values[2], extracted.unit);
    lengthValue = values[3];

    /* ---- Circular Hollow Section ---- */
  } else if (profileId === "pipe") {
    if (values.length !== 3) {
      return createIssue(
        "query",
        "invalid_chs",
        "CHS expects outerDiameter × wall × length.",
      );
    }
    dimensions.outerDiameter = toMm(values[0], extracted.unit);
    dimensions.wallThickness = toMm(values[1], extracted.unit);
    lengthValue = values[2];

    /* ---- Round Bar ---- */
  } else if (profileId === "round_bar") {
    if (values.length !== 2) {
      return createIssue(
        "query",
        "invalid_round_bar",
        "Round bar expects diameter × length.",
      );
    }
    dimensions.diameter = toMm(values[0], extracted.unit);
    lengthValue = values[1];

    /* ---- Square Bar ---- */
  } else if (profileId === "square_bar") {
    if (values.length !== 2) {
      return createIssue(
        "query",
        "invalid_square_bar",
        "Square bar expects side × length.",
      );
    }
    dimensions.side = toMm(values[0], extracted.unit);
    lengthValue = values[1];

    /* ---- Flat Bar / Expanded Metal / Corrugated Sheet ---- */
  } else if (
    profileId === "flat_bar" ||
    profileId === "expanded_metal" ||
    profileId === "corrugated_sheet"
  ) {
    // Allow t= flag to supply thickness so spec can be just width × length
    if (thicknessOverrideMm != null && values.length === 2) {
      dimensions.width = toMm(values[0], extracted.unit);
      dimensions.thickness = thicknessOverrideMm;
      lengthValue = values[1];
    } else if (values.length === 3) {
      dimensions.width = toMm(values[0], extracted.unit);
      dimensions.thickness = toMm(values[1], extracted.unit);
      lengthValue = values[2];
    } else {
      return createIssue(
        "query",
        "invalid_flat",
        thicknessOverrideMm == null
          ? "Expected width × thickness × length (or add t=<thickness>)."
          : "Expected width × length when t= is supplied.",
      );
    }

    /* ---- Sheet / Plate ---- */
  } else if (profileId === "sheet" || profileId === "plate") {
    // Allow t= flag: spec is just width × length
    if (thicknessOverrideMm != null && values.length === 2) {
      dimensions.width = toMm(values[0], extracted.unit);
      dimensions.thickness = thicknessOverrideMm;
      lengthValue = values[1];
    } else if (values.length === 3) {
      const resolved = resolveSheetPlateTriplet(
        profileId,
        values,
        extracted.unit,
      );
      if ("code" in resolved) return resolved;
      dimensions.width = toMm(resolved.width, extracted.unit);
      dimensions.thickness = toMm(resolved.thickness, extracted.unit);
      lengthValue = resolved.length;
    } else {
      return createIssue(
        "query",
        "invalid_sheet_plate",
        thicknessOverrideMm == null
          ? "Expected width × thickness × length (or width × length × thickness, or add t=<thickness>)."
          : "Expected width × length when t= is supplied.",
      );
    }

    /* ---- Chequered Plate ---- */
  } else if (profileId === "chequered_plate") {
    if (values.length !== 4) {
      return createIssue(
        "query",
        "invalid_chequered",
        "Chequered expects width × thickness × pattern × length.",
      );
    }
    dimensions.width = toMm(values[0], extracted.unit);
    dimensions.thickness = toMm(values[1], extracted.unit);
    dimensions.patternHeight = toMm(values[2], extracted.unit);
    lengthValue = values[3];

    /* ---- Manual Angle (custom legs) ---- */
  } else if (profileId === "angle") {
    // Support equal-leg shorthand: angle a×t×L (3 values, legA = legB = a)
    if (values.length === 3) {
      dimensions.legA = toMm(values[0], extracted.unit);
      dimensions.legB = toMm(values[0], extracted.unit);
      dimensions.thickness = toMm(values[1], extracted.unit);
      lengthValue = values[2];
    } else if (values.length === 4) {
      dimensions.legA = toMm(values[0], extracted.unit);
      dimensions.legB = toMm(values[1], extracted.unit);
      dimensions.thickness = toMm(values[2], extracted.unit);
      lengthValue = values[3];
    } else {
      return createIssue(
        "query",
        "invalid_angle",
        "Angle expects legA × legB × thickness × length, or a × thickness × length for equal legs.",
      );
    }
  } else {
    return createIssue(
      "query",
      "unsupported_profile",
      "This profile is not supported in quick parser.",
    );
  }

  const lengthMm = toMm(lengthValue, extracted.unit);
  return {
    manualDimensionsMm: dimensions,
    lengthMm,
    canonicalSpec: `${values.join("x")}${extracted.unit}`,
  };
}

/* ------------------------------------------------------------------ */
/*  Standard geometry parser                                          */
/* ------------------------------------------------------------------ */

function sizeKeysForProfile(
  alias: string,
  profile: StandardProfileDefinition,
  sizeId: string,
  sizeLabel: string,
): string[] {
  const normalizedId = normalizeSizeToken(sizeId);
  const normalizedLabel = normalizeSizeToken(sizeLabel);
  const keys = new Set<string>([normalizedId, normalizedLabel]);

  if (normalizedId.startsWith(alias)) {
    keys.add(normalizedId.slice(alias.length));
  }
  if (normalizedLabel.startsWith(alias)) {
    keys.add(normalizedLabel.slice(alias.length));
  }

  // Tee section: strip leading "t" prefix so "100x10" resolves correctly
  if (profile.id === "tee_en") {
    if (normalizedId.startsWith("t")) keys.add(normalizedId.slice(1));
    if (normalizedLabel.startsWith("t")) keys.add(normalizedLabel.slice(1));
  }

  // For standard hollow / angle, the IDs are already short (e.g. "40x4", "100x60x5")
  // so no extra stripping is needed — the raw id is already a valid key.

  return [...keys].filter((k) => k.length > 0);
}

function parseStandardGeometry(
  alias: string,
  profileId: ProfileId,
  specRaw: string,
  fallbackUnit: LengthUnit,
): ParsedStandardGeometry | QuickParseIssue {
  const profile = getProfileById(profileId);
  if (!profile || profile.mode !== "standard") {
    return createIssue(
      "query",
      "invalid_standard_profile",
      "Profile alias is not linked to an EN standard profile.",
    );
  }

  const cleanedSpec = normalizeSpec(specRaw);
  const extracted = extractTrailingUnit(cleanedSpec, fallbackUnit);
  const body = normalizeSizeToken(extracted.value);

  // Build candidate list sorted longest-key-first to avoid prefix ambiguity
  const candidates = profile.sizes
    .flatMap((size) => {
      const keys = sizeKeysForProfile(alias, profile, size.id, size.label);
      return keys.map((key) => ({ key, sizeId: size.id }));
    })
    .sort((a, b) => b.key.length - a.key.length);

  let match: { sizeId: string; lengthMm: number } | undefined;
  for (const candidate of candidates) {
    if (!body.startsWith(`${candidate.key}x`)) continue;

    const lengthRaw = body.slice(candidate.key.length + 1);
    const lengthValue = parsePositiveNumber(lengthRaw);
    if (!lengthValue) {
      return createIssue(
        "query",
        "invalid_length",
        "Length must be a positive number.",
      );
    }
    match = {
      sizeId: candidate.sizeId,
      lengthMm: toMm(lengthValue, extracted.unit),
    };
    break;
  }

  if (!match) {
    const suggestions = fuzzySuggestions(profile, body);
    const hint =
      suggestions.length > 0 ? `Did you mean: ${suggestions.join(", ")}?` : "";
    return createIssue(
      "query",
      "unknown_size",
      `Unknown size for ${profile.label}. ${hint}`.trim(),
    );
  }

  return {
    selectedSizeId: match.sizeId,
    lengthMm: match.lengthMm,
    canonicalSpec: `${match.sizeId}x${match.lengthMm}mm`,
  };
}

/* ------------------------------------------------------------------ */
/*  Normalized input builder                                           */
/* ------------------------------------------------------------------ */

function buildNormalizedInput(
  base: string,
  qty: number,
  materialGradeId: string,
  density?: number,
  unitPrice?: number,
  currency?: CurrencyCode,
  priceBasis?: PriceBasis,
  customAreaMm2?: number,
): string {
  const parts = [base, `qty=${qty}`];
  if (typeof density === "number") {
    parts.push(`dens=${density}`);
  } else {
    parts.push(`mat=${materialGradeId}`);
  }
  if (typeof unitPrice === "number" && unitPrice > 0) {
    parts.push(`price=${unitPrice}`);
    if (currency) parts.push(`currency=${currency}`);
    if (priceBasis) parts.push(`basis=${priceBasis}`);
  }
  if (typeof customAreaMm2 === "number") {
    parts.push(`area=${customAreaMm2}`);
  }
  return parts.join(" ");
}

/* ------------------------------------------------------------------ */
/*  Main entry point                                                   */
/* ------------------------------------------------------------------ */

export function parseQuickQuery(rawQuery: string): QuickParseResponse {
  const issues: QuickParseIssue[] = [];
  const trimmed = rawQuery.trim();
  if (!trimmed) {
    return {
      ok: false,
      issues: [
        createIssue(
          "query",
          "empty_query",
          "Enter a profile expression like 'shs 40x40x2x4500mm'.",
        ),
      ],
    };
  }

  const normalizedFlagsQuery = normalizeFlagAssignments(trimmed);
  const rawTokens = normalizedFlagsQuery.split(/\s+/).filter(Boolean);
  const { positional, parsed } = parseFlags(rawTokens, issues);

  for (const unknownFlag of parsed.unknownFlags) {
    issues.push(
      createIssue(
        unknownFlag,
        "unknown_flag",
        `Unknown flag '${unknownFlag}'. Supported: qty, mat, dens, unit, price, currency, basis, area, t.`,
      ),
    );
  }

  // When area= is supplied we only need a length token, not full dimensions
  const needsDimensions = parsed.customAreaMm2 == null;
  if (positional.length < 1) {
    issues.push(
      createIssue(
        "query",
        "missing_parts",
        "Expected format: <alias> <dimensions> [flags].",
      ),
    );
  }
  if (needsDimensions && positional.length < 2) {
    issues.push(
      createIssue(
        "query",
        "missing_parts",
        "Expected format: <alias> <dimensions> [flags].",
      ),
    );
  }
  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const alias = normalizeAlias(positional[0]);
  const geometryRaw = positional.slice(1).join("");
  const manualAlias = MANUAL_ALIASES[alias];
  const standardAlias = STANDARD_ALIASES[alias];

  let request: QuickWeightRequest | undefined;

  /* ---------------------------------------------------------------- */
  /*  Manual profile                                                   */
  /* ---------------------------------------------------------------- */
  if (manualAlias) {
    // area= override: geometry is just a length
    if (parsed.customAreaMm2 != null) {
      if (!geometryRaw) {
        issues.push(
          createIssue(
            "query",
            "missing_length",
            "Provide a length after the profile alias when using area=.",
          ),
        );
      } else {
        const cleanedSpec = normalizeSpec(geometryRaw);
        const extracted = extractTrailingUnit(cleanedSpec, parsed.unit);
        const lengthValue = parsePositiveNumber(extracted.value);
        if (!lengthValue) {
          issues.push(
            createIssue(
              "query",
              "invalid_length",
              "Length must be a positive number.",
            ),
          );
        } else {
          const lengthMm = toMm(lengthValue, extracted.unit);
          const normalizedInput = buildNormalizedInput(
            `${manualAlias.canonicalAlias} ${lengthMm}mm`,
            parsed.qty,
            parsed.materialGradeId,
            parsed.density,
            parsed.unitPrice,
            parsed.currency,
            parsed.priceBasis,
            parsed.customAreaMm2,
          );
          request = {
            profileAlias: manualAlias.canonicalAlias,
            profileId: manualAlias.profileId,
            manualDimensionsMm: {},
            lengthMm,
            quantity: parsed.qty,
            materialGradeId: parsed.materialGradeId,
            customDensityKgPerM3: parsed.density,
            customAreaMm2: parsed.customAreaMm2,
            unitPrice: parsed.unitPrice,
            currency: parsed.currency,
            priceBasis: parsed.priceBasis,
            priceUnit: parsed.priceUnit,
            normalizedInput,
          };
        }
      }
    } else {
      const geometry = parseManualGeometry(
        manualAlias.profileId,
        geometryRaw,
        parsed.unit,
        parsed.thickness,
      );
      if ("code" in geometry) {
        issues.push(geometry);
      } else {
        const normalizedInput = buildNormalizedInput(
          `${manualAlias.canonicalAlias} ${geometry.canonicalSpec}`,
          parsed.qty,
          parsed.materialGradeId,
          parsed.density,
          parsed.unitPrice,
          parsed.currency,
          parsed.priceBasis,
        );
        request = {
          profileAlias: manualAlias.canonicalAlias,
          profileId: manualAlias.profileId,
          manualDimensionsMm: geometry.manualDimensionsMm,
          lengthMm: geometry.lengthMm,
          quantity: parsed.qty,
          materialGradeId: parsed.materialGradeId,
          customDensityKgPerM3: parsed.density,
          unitPrice: parsed.unitPrice,
          currency: parsed.currency,
          priceBasis: parsed.priceBasis,
          priceUnit: parsed.priceUnit,
          normalizedInput,
        };
      }
    }

    /* ---------------------------------------------------------------- */
    /*  Standard profile                                                 */
    /* ---------------------------------------------------------------- */
  } else if (standardAlias) {
    // area= override: geometry is just a length — skip size table lookup
    if (parsed.customAreaMm2 != null) {
      if (!geometryRaw) {
        issues.push(
          createIssue(
            "query",
            "missing_length",
            "Provide a length after the profile alias when using area=.",
          ),
        );
      } else {
        const cleanedSpec = normalizeSpec(geometryRaw);
        const extracted = extractTrailingUnit(cleanedSpec, parsed.unit);
        const lengthValue = parsePositiveNumber(extracted.value);
        if (!lengthValue) {
          issues.push(
            createIssue(
              "query",
              "invalid_length",
              "Length must be a positive number.",
            ),
          );
        } else {
          const lengthMm = toMm(lengthValue, extracted.unit);
          const normalizedInput = buildNormalizedInput(
            `${standardAlias.canonicalAlias} ${lengthMm}mm`,
            parsed.qty,
            parsed.materialGradeId,
            parsed.density,
            parsed.unitPrice,
            parsed.currency,
            parsed.priceBasis,
            parsed.customAreaMm2,
          );
          request = {
            profileAlias: standardAlias.canonicalAlias,
            profileId: standardAlias.profileId,
            manualDimensionsMm: {},
            lengthMm,
            quantity: parsed.qty,
            materialGradeId: parsed.materialGradeId,
            customDensityKgPerM3: parsed.density,
            customAreaMm2: parsed.customAreaMm2,
            unitPrice: parsed.unitPrice,
            currency: parsed.currency,
            priceBasis: parsed.priceBasis,
            priceUnit: parsed.priceUnit,
            normalizedInput,
          };
        }
      }
    } else {
      const geometry = parseStandardGeometry(
        standardAlias.canonicalAlias,
        standardAlias.profileId,
        geometryRaw,
        parsed.unit,
      );
      if ("code" in geometry) {
        issues.push(geometry);
      } else {
        const normalizedInput = buildNormalizedInput(
          `${standardAlias.canonicalAlias} ${geometry.canonicalSpec}`,
          parsed.qty,
          parsed.materialGradeId,
          parsed.density,
          parsed.unitPrice,
          parsed.currency,
          parsed.priceBasis,
        );
        request = {
          profileAlias: standardAlias.canonicalAlias,
          profileId: standardAlias.profileId,
          selectedSizeId: geometry.selectedSizeId,
          manualDimensionsMm: {},
          lengthMm: geometry.lengthMm,
          quantity: parsed.qty,
          materialGradeId: parsed.materialGradeId,
          customDensityKgPerM3: parsed.density,
          unitPrice: parsed.unitPrice,
          currency: parsed.currency,
          priceBasis: parsed.priceBasis,
          priceUnit: parsed.priceUnit,
          normalizedInput,
        };
      }
    }

    /* ---------------------------------------------------------------- */
    /*  Unknown alias                                                    */
    /* ---------------------------------------------------------------- */
  } else {
    const supportedAliases = [
      ...new Set(
        [
          ...Object.values(MANUAL_ALIASES),
          ...Object.values(STANDARD_ALIASES),
        ].map((e) => e.canonicalAlias),
      ),
    ].join(", ");
    issues.push(
      createIssue(
        "query",
        "unknown_alias",
        `Unknown profile alias '${positional[0]}'. Try: ${supportedAliases}`,
      ),
    );
  }

  if (issues.length > 0 || !request) {
    return { ok: false, issues };
  }
  return { ok: true, request };
}
