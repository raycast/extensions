/**
 * Test stand-in for `@raycast/api`, which has no resolvable entry outside the
 * Raycast runtime, so any module importing it is otherwise untestable.
 *
 * `getPreferenceValues` returns the DECLARED DEFAULTS from package.json rather
 * than an empty object, which would read every preference as `undefined` and
 * let a test pass through a branch the shipped default never reaches.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

type Preference = { name: string; default?: unknown };

const manifest = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../../package.json", import.meta.url)), "utf8"),
) as { preferences: Preference[] };

const defaults = Object.fromEntries(manifest.preferences.map(({ name, default: value }) => [name, value]));

export const getPreferenceValues = () => defaults;
