import { showToast, Toast, Clipboard, closeMainWindow, showHUD } from "@raycast/api";

function generateRandomDigits(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

function calculateIBANChecksum(bban: string): string {
  const countryCode = "BE";
  const bbanWithCountry = bban + countryCode + "00";
  const numeric = bbanWithCountry
    .split("")
    .map((char) => (char.match(/[A-Z]/) ? (char.charCodeAt(0) - 55).toString() : char))
    .join("");

  const remainder = BigInt(numeric) % 97n;
  const checkDigits = (98n - remainder).toString().padStart(2, "0");
  return checkDigits;
}

function generateBelgianIBAN(): string {
  const bankCode = generateRandomDigits(3);
  const accountNumber = generateRandomDigits(7);
  const nationalCheckDigit = generateRandomDigits(2);

  const bban = bankCode + accountNumber + nationalCheckDigit;
  const checkDigits = calculateIBANChecksum(bban);

  return `BE${checkDigits}${bban}`;
}

export default async function Command() {
  try {
    const iban = generateBelgianIBAN();
    await Clipboard.copy(iban);
    await closeMainWindow();
    await showHUD("✅ Copied IBAN");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to generate IBAN",
      message: String(error),
    });
  }
}
