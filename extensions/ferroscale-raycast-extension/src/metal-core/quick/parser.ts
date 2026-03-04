import { toMillimeters } from "../calculator/units";
import { MATERIAL_GRADES } from "../datasets/materials";
import { getProfileById } from "../datasets/profiles";
import type { LengthUnit, UnitValue } from "../calculator/types";
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

const DEFAULT_GRADE_ID = "steel-s235jr";
const SUPPORTED_UNITS: LengthUnit[] = ["mm", "cm", "m", "in", "ft"];
const UNIT_SUFFIXES: LengthUnit[] = ["mm", "cm", "in", "ft", "m"];

interface ManualAliasConfig {
  profileId: ProfileId;
  canonicalAlias: string;
}

interface StandardAliasConfig {
  profileId: ProfileId;
  canonicalAlias: string;
}

const MANUAL_ALIASES: Record<string, ManualAliasConfig> = {
  shs: { profileId: "square_hollow", canonicalAlias: "shs" },
  squarehollow: { profileId: "square_hollow", canonicalAlias: "shs" },
  rhs: { profileId: "rectangular_tube", canonicalAlias: "rhs" },
  rectangular: { profileId: "rectangular_tube", canonicalAlias: "rhs" },
  chs: { profileId: "pipe", canonicalAlias: "chs" },
  pipe: { profileId: "pipe", canonicalAlias: "chs" },
  rb: { profileId: "round_bar", canonicalAlias: "rb" },
  roundbar: { profileId: "round_bar", canonicalAlias: "rb" },
  sb: { profileId: "square_bar", canonicalAlias: "sb" },
  squarebar: { profileId: "square_bar", canonicalAlias: "sb" },
  fb: { profileId: "flat_bar", canonicalAlias: "fb" },
  flatbar: { profileId: "flat_bar", canonicalAlias: "fb" },
  angle: { profileId: "angle", canonicalAlias: "angle" },
  l: { profileId: "angle", canonicalAlias: "angle" },
  sheet: { profileId: "sheet", canonicalAlias: "sheet" },
  sht: { profileId: "sheet", canonicalAlias: "sheet" },
  plate: { profileId: "plate", canonicalAlias: "plate" },
  pl: { profileId: "plate", canonicalAlias: "plate" },
  chequered: { profileId: "chequered_plate", canonicalAlias: "chequered" },
  expanded: { profileId: "expanded_metal", canonicalAlias: "expanded" },
  corrugated: { profileId: "corrugated_sheet", canonicalAlias: "corrugated" },
};

const STANDARD_ALIASES: Record<string, StandardAliasConfig> = {
  ipe: { profileId: "beam_ipe_en", canonicalAlias: "ipe" },
  ipn: { profileId: "beam_ipn_en", canonicalAlias: "ipn" },
  hea: { profileId: "beam_hea_en", canonicalAlias: "hea" },
  heb: { profileId: "beam_heb_en", canonicalAlias: "heb" },
  hem: { profileId: "beam_hem_en", canonicalAlias: "hem" },
  upn: { profileId: "channel_upn_en", canonicalAlias: "upn" },
  upe: { profileId: "channel_upe_en", canonicalAlias: "upe" },
  tee: { profileId: "tee_en", canonicalAlias: "tee" },
  t: { profileId: "tee_en", canonicalAlias: "tee" },
};

const MATERIAL_ALIASES: Record<string, string> = {
  steel: "steel-s235jr",
  s235: "steel-s235jr",
  s235jr: "steel-s235jr",
  s355: "steel-s355jr",
  s355jr: "steel-s355jr",
  s420: "steel-s420m",
  s420m: "steel-s420m",
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
  alu: "al-6060",
  aluminum: "al-6060",
  aluminium: "al-6060",
  "6060": "al-6060",
  "6082": "al-6082",
  "7075": "al-7075",
};

interface ParsedFlags {
  qty: number;
  materialGradeId: string;
  density?: number;
  unit: LengthUnit;
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

function normalizeFlagAssignments(value: string): string {
  return value.replace(
    /\b(qty|mat|dens|unit)\s*=\s*/gi,
    (_, key: string) => `${key.toLowerCase()}=`,
  );
}

function normalizeSizeToken(value: string): string {
  return normalizeSpec(value).replace(/[^a-z0-9.x]/g, "");
}

function parsePositiveNumber(raw: string): number | undefined {
  const parsed = Number(raw.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
}

function extractTrailingUnit(
  raw: string,
  fallbackUnit: LengthUnit,
): { value: string; unit: LengthUnit } {
  for (const suffix of UNIT_SUFFIXES) {
    if (raw.endsWith(suffix)) {
      return {
        value: raw.slice(0, raw.length - suffix.length),
        unit: suffix,
      };
    }
  }

  return { value: raw, unit: fallbackUnit };
}

function resolveMaterialGradeId(raw?: string): string | undefined {
  if (!raw) {
    return DEFAULT_GRADE_ID;
  }

  const normalized = raw.toLowerCase();
  if (MATERIAL_GRADES.some((grade) => grade.id === normalized)) {
    return normalized;
  }

  const aliasKey = normalized.replace(/[^a-z0-9.]/g, "");
  return MATERIAL_ALIASES[aliasKey];
}

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

    if (!["qty", "mat", "dens", "unit"].includes(key)) {
      unknownFlags.push(key);
      continue;
    }

    rawFlags[key] = value;
  }

  const qty = rawFlags.qty ? parsePositiveNumber(rawFlags.qty) : 1;
  if (!qty) {
    issues.push(
      createIssue("qty", "invalid_qty", "qty must be a positive number."),
    );
  }

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

  const materialGradeId = resolveMaterialGradeId(rawFlags.mat);
  if (!materialGradeId) {
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

  return {
    positional,
    parsed: {
      qty: qty ?? 1,
      materialGradeId: materialGradeId ?? DEFAULT_GRADE_ID,
      density,
      unit,
      unknownFlags,
    },
  };
}

function toMm(value: number, unit: LengthUnit): number {
  const asUnitValue: UnitValue = { value, unit };
  return toMillimeters(asUnitValue.value, asUnitValue.unit);
}

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

  const widthDef = profile.dimensions.find(
    (dimension) => dimension.key === "width",
  );
  const thicknessDef = profile.dimensions.find(
    (dimension) => dimension.key === "thickness",
  );
  if (!widthDef || !thicknessDef) {
    return createIssue(
      "query",
      "invalid_profile",
      "Missing sheet/plate dimension rules.",
    );
  }

  const fitsWidth = (candidate: number) => {
    const mm = toMm(candidate, unit);
    return mm >= widthDef.minMm && mm <= widthDef.maxMm;
  };
  const fitsThickness = (candidate: number) => {
    const mm = toMm(candidate, unit);
    return mm >= thicknessDef.minMm && mm <= thicknessDef.maxMm;
  };

  const candidates = [
    { width: values[0], thickness: values[1], length: values[2] }, // width x thickness x length
    { width: values[0], thickness: values[2], length: values[1] }, // width x length x thickness
  ];

  const validCandidates = candidates.filter(
    (candidate) =>
      fitsWidth(candidate.width) && fitsThickness(candidate.thickness),
  );

  if (validCandidates.length === 0) {
    return createIssue(
      "query",
      "invalid_sheet_plate",
      "Expected width x thickness x length or width x length x thickness.",
    );
  }

  // Prefer the existing default order to stay backward compatible if both match.
  return validCandidates[0];
}

function parseManualGeometry(
  profileId: ProfileId,
  specRaw: string,
  fallbackUnit: LengthUnit,
): ParsedManualGeometry | QuickParseIssue {
  const cleanedSpec = normalizeSpec(specRaw);
  const extracted = extractTrailingUnit(cleanedSpec, fallbackUnit);
  const parts = extracted.value.split("x").filter((part) => part.length > 0);
  const numbers = parts.map(parsePositiveNumber);
  if (numbers.some((value) => value === undefined)) {
    return createIssue(
      "query",
      "invalid_dimension",
      "Dimensions must be positive numbers.",
    );
  }

  const values = numbers as number[];
  const dimensions: Partial<Record<DimensionKey, number>> = {};
  let lengthValue = 0;

  if (profileId === "square_hollow") {
    if (values.length === 4) {
      if (Math.abs(values[0] - values[1]) > 0.0001) {
        return createIssue(
          "query",
          "invalid_shs",
          "SHS expects equal sides (a x a x t x L).",
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
        "SHS expects side x side x wall x length.",
      );
    }
  } else if (profileId === "rectangular_tube") {
    if (values.length !== 4) {
      return createIssue(
        "query",
        "invalid_rhs",
        "RHS expects width x height x wall x length.",
      );
    }
    dimensions.width = toMm(values[0], extracted.unit);
    dimensions.height = toMm(values[1], extracted.unit);
    dimensions.wallThickness = toMm(values[2], extracted.unit);
    lengthValue = values[3];
  } else if (profileId === "pipe") {
    if (values.length !== 3) {
      return createIssue(
        "query",
        "invalid_chs",
        "CHS expects outerDiameter x wall x length.",
      );
    }
    dimensions.outerDiameter = toMm(values[0], extracted.unit);
    dimensions.wallThickness = toMm(values[1], extracted.unit);
    lengthValue = values[2];
  } else if (profileId === "round_bar") {
    if (values.length !== 2) {
      return createIssue(
        "query",
        "invalid_round_bar",
        "Round bar expects diameter x length.",
      );
    }
    dimensions.diameter = toMm(values[0], extracted.unit);
    lengthValue = values[1];
  } else if (profileId === "square_bar") {
    if (values.length !== 2) {
      return createIssue(
        "query",
        "invalid_square_bar",
        "Square bar expects side x length.",
      );
    }
    dimensions.side = toMm(values[0], extracted.unit);
    lengthValue = values[1];
  } else if (
    profileId === "flat_bar" ||
    profileId === "expanded_metal" ||
    profileId === "corrugated_sheet"
  ) {
    if (values.length !== 3) {
      return createIssue(
        "query",
        "invalid_flat",
        "Expected width x thickness x length.",
      );
    }
    dimensions.width = toMm(values[0], extracted.unit);
    dimensions.thickness = toMm(values[1], extracted.unit);
    lengthValue = values[2];
  } else if (profileId === "sheet" || profileId === "plate") {
    if (values.length !== 3) {
      return createIssue(
        "query",
        "invalid_sheet_plate",
        "Expected width x thickness x length or width x length x thickness.",
      );
    }

    const resolved = resolveSheetPlateTriplet(
      profileId,
      values,
      extracted.unit,
    );
    if ("code" in resolved) {
      return resolved;
    }

    dimensions.width = toMm(resolved.width, extracted.unit);
    dimensions.thickness = toMm(resolved.thickness, extracted.unit);
    lengthValue = resolved.length;
  } else if (profileId === "chequered_plate") {
    if (values.length !== 4) {
      return createIssue(
        "query",
        "invalid_chequered",
        "Chequered expects width x thickness x pattern x length.",
      );
    }
    dimensions.width = toMm(values[0], extracted.unit);
    dimensions.thickness = toMm(values[1], extracted.unit);
    dimensions.patternHeight = toMm(values[2], extracted.unit);
    lengthValue = values[3];
  } else if (profileId === "angle") {
    if (values.length !== 4) {
      return createIssue(
        "query",
        "invalid_angle",
        "Angle expects legA x legB x thickness x length.",
      );
    }
    dimensions.legA = toMm(values[0], extracted.unit);
    dimensions.legB = toMm(values[1], extracted.unit);
    dimensions.thickness = toMm(values[2], extracted.unit);
    lengthValue = values[3];
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

  if (profile.id === "tee_en") {
    if (normalizedId.startsWith("t")) {
      keys.add(normalizedId.slice(1));
    }
    if (normalizedLabel.startsWith("t")) {
      keys.add(normalizedLabel.slice(1));
    }
  }

  return [...keys].filter((key) => key.length > 0);
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

  const candidates = profile.sizes
    .flatMap((size) => {
      const keys = sizeKeysForProfile(alias, profile, size.id, size.label);
      return keys.map((key) => ({ key, sizeId: size.id }));
    })
    .sort((a, b) => b.key.length - a.key.length);

  let match: { sizeId: string; lengthMm: number } | undefined;
  for (const candidate of candidates) {
    if (!body.startsWith(`${candidate.key}x`)) {
      continue;
    }

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
    const sample = profile.sizes
      .slice(0, 4)
      .map((size) => size.label)
      .join(", ");
    return createIssue(
      "query",
      "unknown_size",
      `Could not resolve EN size. Try one of: ${sample}`,
    );
  }

  return {
    selectedSizeId: match.sizeId,
    lengthMm: match.lengthMm,
    canonicalSpec: `${match.sizeId}x${match.lengthMm}mm`,
  };
}

function buildNormalizedInput(
  base: string,
  qty: number,
  materialGradeId: string,
  density?: number,
): string {
  const parts = [base, `qty=${qty}`];
  if (typeof density === "number") {
    parts.push(`dens=${density}`);
  } else {
    parts.push(`mat=${materialGradeId}`);
  }
  return parts.join(" ");
}

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
        `Unknown flag '${unknownFlag}'. Supported flags: qty, mat, dens, unit.`,
      ),
    );
  }

  if (positional.length < 2) {
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

  if (manualAlias) {
    const geometry = parseManualGeometry(
      manualAlias.profileId,
      geometryRaw,
      parsed.unit,
    );
    if ("code" in geometry) {
      issues.push(geometry);
    } else {
      const normalizedInput = buildNormalizedInput(
        `${manualAlias.canonicalAlias} ${geometry.canonicalSpec}`,
        parsed.qty,
        parsed.materialGradeId,
        parsed.density,
      );
      request = {
        profileAlias: manualAlias.canonicalAlias,
        profileId: manualAlias.profileId,
        manualDimensionsMm: geometry.manualDimensionsMm,
        lengthMm: geometry.lengthMm,
        quantity: parsed.qty,
        materialGradeId: parsed.materialGradeId,
        customDensityKgPerM3: parsed.density,
        normalizedInput,
      };
    }
  } else if (standardAlias) {
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
        normalizedInput,
      };
    }
  } else {
    const supportedAliases = [
      ...new Set(
        [
          ...Object.values(MANUAL_ALIASES),
          ...Object.values(STANDARD_ALIASES),
        ].map((entry) => entry.canonicalAlias),
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
