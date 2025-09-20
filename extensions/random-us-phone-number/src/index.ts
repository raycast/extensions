import { showHUD, Clipboard, getPreferenceValues } from "@raycast/api";
import libphonenumber from "google-libphonenumber";
import randomPhone from "random-phone";

const { defaultAction: action, includeAreaCode } = getPreferenceValues();
const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();

export default async function main() {
  let number = phoneUtil.parse(randomPhone(), "US");
  while (!phoneUtil.isValidNumber(number)) {
    number = phoneUtil.parse(randomPhone(), "US");
  }
  let phoneNumber = phoneUtil.format(number, 0);
  if (!includeAreaCode) {
    phoneNumber = phoneNumber.replace(/\D/g, "").slice(1);
  }
  if (action === "copy") {
    await Clipboard.copy(phoneNumber);
    await showHUD(`Copied Number: ${phoneNumber}`);
  } else {
    await Clipboard.paste(phoneNumber);
  }
}
