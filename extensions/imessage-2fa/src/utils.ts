import { LookBackUnitType } from "./types";

/**
 * try to extract iMessage 2FA Code, empty result if not found any code
 *
 * @param original - original message text from iMessage
 * @returns
 * @see https://github.com/squatto/alfred-imessage-2fa/blob/master/find-messages.php
 */
export function extractCode(original: string) {
  // remove URLs
  const urlRegex = new RegExp(
    "\\b((https?|ftp|file):\\/\\/|www\\.)[-A-Z0-9+&@#\\/%?=~_|$!:,.;]*[A-Z0-9+&@#\\/%=~_|$]",
    "ig"
  );
  let message = original.replaceAll(urlRegex, "");

  if (message.trim() === "") return "";

  let m;
  let code;

  // Look for specific patterns first
  if ((m = /^(\d{4,8})(\sis your.*code)/.exec(message)) !== null) {
    // 4-8 digits followed by "is your [...] code"
    // examples:
    //   "2773 is your Microsoft account verification code"
    code = m[1];
  } else if ((m = /(code\s*:|is\s*:|码)\s*(\w{4,8})($|\s|\\R|\t|\b|\.|,)/i.exec(message)) !== null) {
    // "code:" OR "is:", optional whitespace, then 4-8 consecutive alphanumeric characters
    // examples:
    //   "Your Airbnb verification code is: 1234."
    //   "Your verification code is: 1234, use it to log in"
    //   "Here is your authorization code:9384"
    //   "【抖音】验证码9316，用于手机验证"
    //   "Your healow verification code is : 7579."
    //   "TRUSTED LOCATION PASSCODE: mifsuc"
    code = m[2];
  } else {
    // more generic, brute force patterns

    // remove phone numbers
    // we couldn't do this before, because some auth codes resemble text shortcodes, which would be filtered by this regex
    const phoneRegex = new RegExp(
      // https://stackoverflow.com/a/123666
      /(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?/,
      "ig"
    );
    message = message.replaceAll(phoneRegex, "");

    if ((m = /(^|\s|\\R|\t|\b|G-|:)(\d{5,8})($|\s|\\R|\t|\b|\.|,)/.exec(message)) !== null) {
      // 5-8 consecutive digits
      // examples:
      //   "您的验证码是 199035，10分钟内有效，请勿泄露"
      //   "登录验证码：627823，您正在尝试【登录】，10分钟内有效"
      //   "【赛验】验证码 54538"
      //   "Enter this code to log in:59678."
      //   "G-315643 is your Google verification code"
      //   "Enter the code 765432, and then click the button to log in."
      //   "Your code is 45678!"
      //   "Your code is:98765!"
      code = m[2];
    } else if ((m = /\b(?=[A-Z]*[0-9])(?=[0-9]*[A-Z])[0-9A-Z]{3,8}\b/.exec(message)) !== null) {
      // 3-8 character uppercase alphanumeric string, containing at least one letter and one number
      // examples:
      //   "5WGU8G"
      //   "Your code is: 5WGU8G"
      //   "CWGUG8"
      //   "CWGUG8 is your code"
      //   "7645W453"
      code = m[0];
    } else if ((m = /(^|code:|is:|\b)\s*(\d{3})-(\d{3})($|\s|\\R|\t|\b|\.|,)/i.exec(message)) !== null) {
      // line beginning OR "code:" OR "is:" OR word boundary, optional whitespace, 3 consecutive digits, a hyphen, then 3 consecutive digits
      // but NOT a phone number (###-###-####)
      // examples:
      //   "123-456"
      //   "Your Stripe verification code is: 719-839."
      // and make sure it isn't a phone number
      // doesn't match: <first digits>-<second digits>-<4 consecutive digits>

      const first = m[2];
      const second = m[3];

      code = `${first}${second}`;
    } else if ((m = /(code|is):?\s*(\d{3,8})($|\s|\\R|\t|\b|\.|,)/i.exec(message)) !== null) {
      // "code" OR "is" followed by an optional ":" + optional whitespace, then 3-8 consecutive digits
      // examples:
      //   "Please enter code 548 on Zocdoc."
      code = m[2];
    }
  }

  return code;
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
 * @returns The total minutes for the look back period. Returns 0 for unrecognized units.
 */
export function calculateLookBackMinutes(lookBackUnit: LookBackUnitType, lookBackAmount = 1): number {
  const unitMinutes = unitToMinutesMap[lookBackUnit] || 0;
  return unitMinutes * lookBackAmount;
}
