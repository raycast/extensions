/**
 * Reads the manifest's preferences and turns them into usable values.
 *
 * The raw shape is **not** declared here. It used to be, as a hand-written `RawPreferences`
 * interface listing all five fields, which is a second copy of `package.json` that nothing
 * keeps in step: rename a preference and the handwritten type still compiles, still reads
 * `undefined`, and silently falls back to a default. `ray build` generates
 * `raycast-env.d.ts` from the manifest for exactly this reason, and the store repository
 * requires `getPreferenceValues` to use it.
 *
 * `ExtensionPreferences` is that generated type, global and regenerated on every build.
 */

import { getPreferenceValues } from "@raycast/api";
import { clampPreferences, type NumericPreferences } from "../lib/config/preferences";

/** What the rest of the extension consumes: numbers clamped, the CLI path defaulted. */
export interface ResolvedPreferences extends NumericPreferences {
  argocdCliPath: string;
}

export function readPreferences(): ResolvedPreferences {
  const raw = getPreferenceValues<ExtensionPreferences>();
  const cliPath = raw.argocdCliPath?.trim();
  return {
    ...clampPreferences(raw),
    argocdCliPath: cliPath && cliPath.length > 0 ? cliPath : "argocd",
  };
}
