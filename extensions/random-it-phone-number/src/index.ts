import { Clipboard, getPreferenceValues, showHUD } from "@raycast/api";

function generateItalianPhoneNumber() {
  const prefixes = ["320", "330", "340", "350", "360", "370", "380", "390"]; // Prefissi italiani comuni
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];

  const randomDigits = () => Math.floor(Math.random() * 10);

  const phoneNumber = `${prefix}${randomDigits()}${randomDigits()}${randomDigits()}${randomDigits()}${randomDigits()}${randomDigits()}${randomDigits()}`;

  return phoneNumber;
}

console.log(generateItalianPhoneNumber());

const { defaultAction: action } = getPreferenceValues();

export default async function main() {
  let phoneNumber = generateItalianPhoneNumber();
  if (action === "copy") {
    await Clipboard.copy(phoneNumber);
    await showHUD(`Copied Number: ${phoneNumber}`);
  } else {
    await Clipboard.paste(phoneNumber);
  }
}
