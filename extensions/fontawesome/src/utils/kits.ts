import type { Kit } from "@/types";

export function filterKits(kits: Kit[], kitFilter?: string) {
  const trimmedFilter = kitFilter?.trim();

  if (!trimmedFilter || kits.length === 0) {
    return kits;
  }

  const tokensOrNames = trimmedFilter
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.toLowerCase());

  if (tokensOrNames.length === 0) {
    return kits;
  }

  return kits.filter((kit) => {
    const nameLower = kit.name.toLowerCase();
    const tokenLower = kit.token.toLowerCase();
    return tokensOrNames.some((value) => value === tokenLower || value === nameLower);
  });
}

export function findKitByToken<T extends Kit>(kits: T[], kitToken: string) {
  return kits.find((kit) => kit.token === kitToken);
}
