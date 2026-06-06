/* Standalone sanity check for the VAT generators.
 * Checksum-tier numbers are validated via @accountable/jsvat.
 * US EINs are validated against IRS-allowed prefixes (no checksum exists). */
import { checkVAT } from "@accountable/jsvat";
import { COUNTRIES, generateVat, Country } from "../src/lib/countries";
import { VALID_EIN_PREFIXES } from "../src/lib/generators";

const einPrefixes = new Set<string>(VALID_EIN_PREFIXES);

function isValidUsEin(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 9) return false;
  return einPrefixes.has(digits.slice(0, 2));
}

let failures = 0;
const ITER = 500;

for (const country of COUNTRIES) {
  for (let i = 0; i < ITER; i++) {
    const full = generateVat(country);
    if (country.tier === "checksum") {
      const result = checkVAT(full);
      if (!result.isValid) {
        console.error(`CHECKSUM FAIL ${country.code}: ${full} (jsvat format: ${result.isValidFormat})`);
        failures++;
        break;
      }
    } else if (country.code === "US") {
      if (!isValidUsEin(full)) {
        console.error(`EIN FAIL ${country.code}: ${full}`);
        failures++;
        break;
      }
    }
  }
}

const sample = COUNTRIES.map((c: Country) => `${c.flag} ${c.code} ${c.tier.padEnd(8)} ${generateVat(c)}`).join("\n");
console.log(sample);
console.log("");
if (failures === 0) {
  console.log(`All ${COUNTRIES.length} countries passed (${ITER} iterations each).`);
} else {
  console.error(`${failures} country check(s) FAILED.`);
  process.exit(1);
}
