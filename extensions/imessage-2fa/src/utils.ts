import { LookBackUnitType } from "./types";

/**
 * try to extract iMessage 2FA Code, empty result if not found any code
 *
 * @param original - original message text from iMessage
 * @returns
 * @see https://github.com/squatto/alfred-imessage-2fa/blob/master/find-messages.php
 */
export function extractCode(original: string): string | null {
  // remove URLs
  const urlRegex = new RegExp(
    "\\b((https?|ftp|file):\\/\\/|www\\.)[-A-Z0-9+&@#\\/%?=~_|$!:,.;]*[A-Z0-9+&@#\\/%=~_|$]",
    "ig"
  );
  let message = original.replaceAll(urlRegex, "");

  if (message.trim() === "") return null;

  let m;
  let code;

  // Look for specific patterns first
  if ((m = /^(\d{4,8})(\sis your.*code)/.exec(message)) !== null) {
    code = m[1];
  } else if (
    (m = /(code\s*:|is\s*:|码|use code|autoriza(?:ca|çã)o\s*:|c(?:o|ó)digo\s*:)\s*(\w{4,8})($|\s|\\R|\t|\b|\.|,)/i.exec(
      message
    )) !== null
  ) {
    code = m[2];
  } else {
    // more generic, brute force patterns
    const phoneRegex = new RegExp(
      /(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?/,
      "ig"
    );

    message = message.replaceAll(phoneRegex, "");

    if ((m = /(^|\s|\\R|\t|\b|G-|:)(\d{5,8})($|\s|\\R|\t|\b|\.|,)/.exec(message)) !== null) {
      code = m[2];
    } else if ((m = /\b(?=[A-Z]*[0-9])(?=[0-9]*[A-Z])[0-9A-Z]{3,8}\b/.exec(message)) !== null) {
      code = m[0];
    } else if ((m = /(^|code:|is:|\b)\s*(\d{3})-(\d{3})($|\s|\\R|\t|\b|\.|,)/i.exec(message)) !== null) {
      const first = m[2];
      const second = m[3];
      code = `${first}${second}`;
    } else if ((m = /(code|is):?\s*(\d{3,8})($|\s|\\R|\t|\b|\.|,)/i.exec(message)) !== null) {
      code = m[2];
    }
  }

  return code || null;
}

// This object maps each unit of time to the number of minutes it contains.
const unitToMinutesMap: { [unit in LookBackUnitType]: number } = {
  DAYS: 24 * 60,
  HOURS: 60,
  MINUTES: 1,
};

/**
 * Calculates the total minutes based on a specified look back unit and amount.
 *
 * @param lookBackUnit - The time unit ('DAYS', 'HOURS', 'MINUTES') for the look back period.
 * @param lookBackAmount - The quantity of the specified unit, defaults to 1.
 * @returns The total minutes for the look back period. Returns 10 for unrecognized units.
 */
export function calculateLookBackMinutes(lookBackUnit: LookBackUnitType, lookBackAmount = 1): number {
  const unitMinutes = unitToMinutesMap[lookBackUnit] || 1;
  return unitMinutes * lookBackAmount;
}

/**
 * Format a date using the system's locale settings
 * @param date The date to format
 * @returns A localized date string
 */
export function formatDate(date: Date): string {
  return date.toLocaleString();
}
