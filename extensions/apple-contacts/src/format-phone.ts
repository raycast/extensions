import { parsePhoneNumberFromString } from "libphonenumber-js";

export function formatPhoneNumber(raw: string): string {
  if (!raw) return raw;
  try {
    const phone = parsePhoneNumberFromString(raw);
    if (phone?.isValid()) {
      return phone.formatInternational();
    }
    return raw;
  } catch {
    return raw;
  }
}
