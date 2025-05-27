interface CountryIBANFormat {
  countryCode: string;
  length: number;
  bankCodeLength: number;
  accountNumberLength: number;
  checkDigitLength: number;
}

const COUNTRY_FORMATS: Record<string, CountryIBANFormat> = {
  BE: { countryCode: "BE", length: 16, bankCodeLength: 3, accountNumberLength: 7, checkDigitLength: 2 },
  NL: { countryCode: "NL", length: 18, bankCodeLength: 4, accountNumberLength: 10, checkDigitLength: 2 },
  DE: { countryCode: "DE", length: 22, bankCodeLength: 8, accountNumberLength: 10, checkDigitLength: 2 },
  FR: { countryCode: "FR", length: 27, bankCodeLength: 5, accountNumberLength: 11, checkDigitLength: 2 },
  ES: { countryCode: "ES", length: 24, bankCodeLength: 4, accountNumberLength: 10, checkDigitLength: 2 },
  IT: { countryCode: "IT", length: 27, bankCodeLength: 1, accountNumberLength: 10, checkDigitLength: 2 },
  GB: { countryCode: "GB", length: 22, bankCodeLength: 4, accountNumberLength: 14, checkDigitLength: 2 },
  CH: { countryCode: "CH", length: 21, bankCodeLength: 5, accountNumberLength: 12, checkDigitLength: 2 },
  AT: { countryCode: "AT", length: 20, bankCodeLength: 5, accountNumberLength: 11, checkDigitLength: 2 },
  LU: { countryCode: "LU", length: 20, bankCodeLength: 3, accountNumberLength: 13, checkDigitLength: 2 },
};

export function getRandomCountry(): string {
  const countries = Object.keys(COUNTRY_FORMATS);
  return countries[Math.floor(Math.random() * countries.length)];
}

function generateRandomDigits(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

function calculateIBANChecksum(bban: string, countryCode: string): string {
  const bbanWithCountry = bban + countryCode + "00";
  const numeric = bbanWithCountry
    .split("")
    .map((char) => (char.match(/[A-Z]/) ? (char.charCodeAt(0) - 55).toString() : char))
    .join("");

  const remainder = BigInt(numeric) % 97n;
  const checkDigits = (98n - remainder).toString().padStart(2, "0");
  return checkDigits;
}

export function generateIBAN(countryCode?: string): string {
  const selectedCountry = countryCode || getRandomCountry();
  const format = COUNTRY_FORMATS[selectedCountry];

  if (!format) {
    throw new Error(`Unsupported country code: ${selectedCountry}`);
  }

  const bankCode = generateRandomDigits(format.bankCodeLength);
  const accountNumber = generateRandomDigits(format.accountNumberLength);
  const checkDigit = generateRandomDigits(format.checkDigitLength);

  const bban = bankCode + accountNumber + checkDigit;
  const checkDigits = calculateIBANChecksum(bban, selectedCountry);

  return `${selectedCountry}${checkDigits}${bban}`;
}

export function getSupportedCountries(): string[] {
  return Object.keys(COUNTRY_FORMATS).sort();
}
