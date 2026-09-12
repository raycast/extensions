import { getPreferenceValues } from "@raycast/api";

const DEFAULT_RESULT_LIMIT = 10;
const MIN_RESULT_LIMIT = 1;
const MAX_RESULT_LIMIT = 100;

/**
 * Reads extension preferences using Raycast's *generated* ambient `Preferences`
 * type (never a hand-declared interface — house-style [lint] rule).
 *
 * `resultLimit` arrives as a **string** from the textfield preference, so it must
 * be parsed before it can be range-checked. The previous hand-rolled
 * `interface Preferences { resultLimit: number }` mistyped it, which made the
 * clamp silently dead (`"10" < 1` and `"10" > 100` are both false) and passed a
 * string through as the API's `limit`.
 */
export default function getPreferences() {
  const { resultLimit } = getPreferenceValues<Preferences>();

  const parsed = Number.parseInt(resultLimit, 10);
  const limit = Number.isNaN(parsed)
    ? DEFAULT_RESULT_LIMIT
    : Math.min(Math.max(parsed, MIN_RESULT_LIMIT), MAX_RESULT_LIMIT);

  return { resultLimit: limit };
}
