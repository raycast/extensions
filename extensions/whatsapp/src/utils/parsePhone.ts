import { getPreferenceValues } from "@raycast/api";
import { phone as parsePhone } from "phone";

/**
 * Parse a user-entered phone number using the configured default country.
 * If the input already starts with "+" we treat it as international and ignore
 * the preference (so an IL user can still paste a US +1 number).
 */
export function parseUserPhone(input: string): ReturnType<typeof parsePhone> {
  const trimmed = input.trim();
  if (trimmed.startsWith("+")) {
    return parsePhone(trimmed);
  }
  const { defaultCountry } = getPreferenceValues<Preferences>();
  const country = defaultCountry.trim().toUpperCase();
  if (country) {
    return parsePhone(trimmed, { country });
  }
  return parsePhone(trimmed);
}
