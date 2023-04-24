/**
 * try to extract iMessage 2FA Code, empty result if not found any code
 *
 * @param original - original message text from iMessage
 * @returns
 * @see https://github.com/squatto/alfred-imessage-2fa/blob/master/find-messages.php
 */
export function extractCode(original: string) {
  // remove URLs
  const regex = new RegExp(
    "\\b((https?|ftp|file):\\/\\/|www\\.)[-A-Z0-9+&@#\\/%?=~_|$!:,.;]*[A-Z0-9+&@#\\/%=~_|$]",
    "ig"
  );
  const message = original.replaceAll(regex, "");

  if (message.trim() === "") return "";

  let m;
  let code;

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
  }
  if ((m = /^(\d{4,8})(\sis your.*code)/.exec(message)) !== null) {
    // 4-8 digits followed by "is your [...] code"
    // examples:
    //   "2773 is your Microsoft account verification code"
    code = m[1];
  }
  if ((m = /(code:|is:|码)\s*(\d{4,8})($|\s|\\R|\t|\b|\.|,)/i.exec(message)) !== null) {
    // "code:" OR "is:", optional whitespace, then 4-8 consecutive digits
    // examples:
    //   "Your Airbnb verification code is: 1234."
    //   "Your verification code is: 1234, use it to log in"
    //   "Here is your authorization code:9384"
    //   "【抖音】验证码9316，用于手机验证"
    code = m[2];
  }
  if ((m = /(code|is):?\s*(\d{3,8})($|\s|\\R|\t|\b|\.|,)/i.exec(message)) !== null) {
    // "code" OR "is" followed by an optional ":" + optional whitespace, then 3-8 consecutive digits
    // examples:
    //   "Please enter code 548 on Zocdoc."
    code = m[2];
  }
  if ((m = /(^|code:|is:|\b)\s*(\d{3})-(\d{3})($|\s|\\R|\t|\b|\.|,)/i.exec(message)) !== null) {
    // line beginning OR "code:" OR "is:" OR word boundary, optional whitespace, 3 consecutive digits, a hyphen, then 3 consecutive digits
    // but NOT a phone number (###-###-####)
    // examples:
    //   "123-456"
    //   "Your Stripe verification code is: 719-839."
    // and make sure it isn't a phone number
    // doesn't match: <first digits>-<second digits>-<4 consecutive digits>

    const first = m[2];
    const second = m[3];
    if (!new RegExp("/(^|code:|is:|\b)s*" + first + "-" + second + "-(d{4})($|s|R|\t|\b|.|,)/").test(message)) {
      return `${first}${second}`;
    }
    return "";
  }

  return code;
}
