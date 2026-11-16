/**
 * Flag emoji from OpenSkiData's English country names, using the system's region names
 * (Intl.DisplayNames) instead of a hand-maintained table.
 */
const ALIASES: Record<string, string> = { Turkey: "TR", "Bosnia and Herzegovina": "BA" };

let codes: Map<string, string> | undefined;

function codeFor(country: string): string | undefined {
  if (!codes) {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    codes = new Map(Object.entries(ALIASES));
    for (let a = 65; a <= 90; a++) {
      for (let b = 65; b <= 90; b++) {
        const code = String.fromCharCode(a, b);
        // Retired codes share a name with their replacement but have no flag (FX "France", SU "Russia").
        if (Intl.getCanonicalLocales(`und-${code}`)[0] !== `und-${code}`) continue;
        const name = names.of(code);
        if (name && name !== code) codes.set(name, code);
      }
    }
  }
  return codes.get(country);
}

/** "🇨🇦" for "Canada", "🇮🇹🇨🇭" for "Italy / Switzerland", "" when unknown. */
export function flag(country: string): string {
  return country
    .split(" / ")
    .map(codeFor)
    .filter((code): code is string => code !== undefined)
    .map((code) => String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)))
    .join("");
}
