import { IBAN, CountryCode } from "ibankit";

// List of countries that actually use IBAN
const IBAN_COUNTRIES = [
  "AD",
  "AE",
  "AL",
  "AT",
  "AZ",
  "BA",
  "BE",
  "BG",
  "BH",
  "BR",
  "BY",
  "CH",
  "CR",
  "CY",
  "CZ",
  "DE",
  "DK",
  "DO",
  "EE",
  "EG",
  "ES",
  "FI",
  "FO",
  "FR",
  "GB",
  "GE",
  "GI",
  "GL",
  "GR",
  "GT",
  "HR",
  "HU",
  "IE",
  "IL",
  "IQ",
  "IS",
  "IT",
  "JO",
  "KW",
  "KZ",
  "LB",
  "LC",
  "LI",
  "LT",
  "LU",
  "LV",
  "MC",
  "MD",
  "ME",
  "MK",
  "MR",
  "MT",
  "MU",
  "NL",
  "NO",
  "PK",
  "PL",
  "PS",
  "PT",
  "QA",
  "RO",
  "RS",
  "SA",
  "SC",
  "SE",
  "SI",
  "SK",
  "SM",
  "ST",
  "SV",
  "TL",
  "TN",
  "TR",
  "UA",
  "VA",
  "VG",
  "XK",
] as const;

const MAX_RETRIES = 3;

export function getRandomCountry(): string {
  // Filter to only include actual IBAN countries
  const countries = Object.values(CountryCode).filter((code) =>
    IBAN_COUNTRIES.includes(code as (typeof IBAN_COUNTRIES)[number]),
  );
  return countries[Math.floor(Math.random() * countries.length)];
}

export function generateIBAN(countryCode?: string): string {
  let lastError: Error | null = null;

  // Try up to MAX_RETRIES times
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Validate country code if provided
      if (countryCode) {
        if (!IBAN_COUNTRIES.includes(countryCode as (typeof IBAN_COUNTRIES)[number])) {
          throw new Error(`Country ${countryCode} does not use IBAN format`);
        }
        if (!Object.values(CountryCode).includes(countryCode as CountryCode)) {
          throw new Error(`Invalid country code: ${countryCode}`);
        }
      }

      const selectedCountry = (countryCode || getRandomCountry()) as CountryCode;
      console.log(`Generating IBAN for country: ${selectedCountry} (attempt ${attempt}/${MAX_RETRIES})`);

      // Use the random method which handles country-specific lengths
      const iban = IBAN.random(selectedCountry);
      if (!iban) {
        throw new Error(`Failed to generate IBAN for country: ${selectedCountry}`);
      }

      const ibanString = iban.toString();
      console.log(`Generated IBAN: ${ibanString}`);

      // Validate the generated IBAN
      if (!IBAN.isValid(ibanString)) {
        throw new Error(`Generated invalid IBAN: ${ibanString}`);
      }

      // Additional validation: check if it starts with the correct country code
      if (!ibanString.startsWith(selectedCountry)) {
        throw new Error(`Generated IBAN has incorrect country code: ${ibanString}`);
      }

      return ibanString;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`IBAN generation attempt ${attempt} failed:`, lastError);

      // If this was the last attempt, throw the error
      if (attempt === MAX_RETRIES) {
        throw new Error(
          `Failed to generate valid IBAN after ${MAX_RETRIES} attempts. Last error: ${lastError.message}`,
        );
      }

      // Otherwise, continue to next attempt
      continue;
    }
  }

  // This should never happen due to the throw in the loop, but TypeScript needs it
  throw new Error(`Failed to generate IBAN: ${lastError?.message || "Unknown error"}`);
}

export function getSupportedCountries(): string[] {
  // Only return countries that actually use IBAN
  return Object.values(CountryCode)
    .filter((code) => IBAN_COUNTRIES.includes(code as (typeof IBAN_COUNTRIES)[number]))
    .sort();
}
