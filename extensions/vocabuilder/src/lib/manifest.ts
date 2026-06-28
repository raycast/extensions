import pkg from "../../package.json";

type RaycastPreference = { name: string; default?: unknown };

/**
 * Read the `default` value of a Raycast preference declared in package.json.
 *
 * In production, Raycast itself layers user-set values over these defaults
 * inside `getPreferenceValues()`. This helper is for code paths that don't
 * run inside the Raycast runtime (evals, tests) and for boundary code that
 * needs the manifest default as a fallback when a preference textfield is
 * cleared.
 *
 * Throws when the preference is missing or has no non-empty string default —
 * those are manifest authoring mistakes and we want them to fail loudly at
 * the call site, not propagate empty strings into Gemini URLs.
 */
export function getPreferenceDefault(name: string): string {
  const preferences = (pkg.preferences ?? []) as RaycastPreference[];
  const pref = preferences.find((p) => p.name === name);
  if (!pref) {
    throw new Error(`Preference "${name}" not declared in package.json`);
  }
  if (typeof pref.default !== "string" || pref.default === "") {
    throw new Error(`Preference "${name}" has no non-empty string default in package.json`);
  }
  return pref.default;
}
