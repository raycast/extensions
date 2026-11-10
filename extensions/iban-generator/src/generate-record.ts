import { RANDOM_BANK } from "./constants";
import type { FormPrefs } from "./form-prefs";
import { generateIban, generateInvalidIban, type GenerateOptions, type GeneratedIban } from "./lib";
import type { IbanFormat, SavedIban } from "./storage";
import { VALIDITY_VALID, type ValidityChoice } from "./validity";

export function buildGenerateOptions(countryCode: string, bankSelection: string): GenerateOptions {
  if (bankSelection === RANDOM_BANK) {
    return { countryCode };
  }
  return { countryCode, bankCode: bankSelection };
}

export function generateRecord(prefs: FormPrefs, validity: ValidityChoice): GeneratedIban {
  const options = buildGenerateOptions(prefs.countryCode, prefs.bankSelection);
  if (validity === VALIDITY_VALID) {
    return generateIban(options);
  }
  return generateInvalidIban(options, validity);
}

export function toSavedIban(generated: GeneratedIban, format: IbanFormat, extras?: Pick<SavedIban, "note">): SavedIban {
  return {
    ...generated,
    format,
    savedAt: new Date().toISOString(),
    ...extras,
  };
}
