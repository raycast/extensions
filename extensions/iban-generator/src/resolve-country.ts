import { COUNTRIES, type Country } from "./lib";

export type ResolveCountryResult =
  | { ok: true; code: string }
  | { ok: false; reason: "empty" | "unknown" | "ambiguous"; query: string; matches?: string[] };

export function resolveCountryInput(input: string, countries: Country[] = COUNTRIES): ResolveCountryResult {
  const query = input.trim();
  if (!query) {
    return { ok: false, reason: "empty", query: "" };
  }

  const lower = query.toLowerCase();

  const exactCode = countries.filter((c) => c.code.toLowerCase() === lower);
  if (exactCode.length === 1) {
    return { ok: true, code: exactCode[0].code };
  }

  const exactName = countries.filter((c) => c.name.toLowerCase() === lower);
  if (exactName.length === 1) {
    return { ok: true, code: exactName[0].code };
  }
  if (exactName.length > 1) {
    return {
      ok: false,
      reason: "ambiguous",
      query,
      matches: exactName.map((c) => c.name),
    };
  }

  const prefixName = countries.filter((c) => c.name.toLowerCase().startsWith(lower));
  if (prefixName.length === 1) {
    return { ok: true, code: prefixName[0].code };
  }
  if (prefixName.length > 1) {
    return {
      ok: false,
      reason: "ambiguous",
      query,
      matches: prefixName.map((c) => c.name),
    };
  }

  return { ok: false, reason: "unknown", query };
}
