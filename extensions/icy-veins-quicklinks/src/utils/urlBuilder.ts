import type { ParsedInput } from "../types";

const BASE = "https://www.icy-veins.com/wow";

const PVE_ROLE_URL_SEGMENT: Record<string, string> = {
  dps: "dps",
  tank: "tank",
  healer: "healing",
};

export function buildUrl(input: ParsedInput): string {
  const { spec, mode, page } = input;

  const urlSuffix = spec.urlSuffixOverrides?.[page.urlSuffix] ?? page.urlSuffix;

  if (page.special) {
    return `${BASE}/${spec.slug}-${urlSuffix}`;
  }

  if (mode === "pvp") {
    return `${BASE}/${spec.slug}-${urlSuffix}`;
  }

  const roleSegment = PVE_ROLE_URL_SEGMENT[spec.pveRole] ?? spec.pveRole;
  return `${BASE}/${spec.slug}-pve-${roleSegment}-${urlSuffix}`;
}
