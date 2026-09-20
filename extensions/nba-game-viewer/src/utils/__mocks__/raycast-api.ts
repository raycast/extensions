/**
 * Test stand-in for `@raycast/api`, which has no resolvable entry outside the
 * Raycast runtime, so any module importing it is otherwise untestable.
 *
 * `getPreferenceValues` returns the DECLARED DEFAULTS from package.json rather
 * than an empty object, which would read every preference as `undefined` and
 * let a test pass through a branch the shipped default never reaches.
 */
import manifest from "../../../package.json";

const defaults = Object.fromEntries(manifest.preferences.map(({ name, default: value }) => [name, value]));

export const getPreferenceValues = () => defaults;

export const Toast = {
  Style: {
    Success: "SUCCESS",
    Failure: "FAILURE",
    Animated: "ANIMATED",
  },
} as const;

export const showToast = async (options: { style?: string; title: string; message?: string }) => options;
