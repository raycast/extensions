import { environment, getPreferenceValues } from "@raycast/api";
import path from "node:path";

import { copyGeneratedSecret } from "./helpers/clipboard";
import { confirmPassphraseStrength, getErrorMessage, showFailureToast } from "./helpers/feedback";
import {
  generatePassphrase,
  passphraseEntropyBits,
  passphraseFormatUsesWords,
  resolvePassphraseFormat,
  validatePassphraseFormat,
} from "./helpers/helpers";
import { EFF_WORD_LIST_FILE_NAME, loadPassphraseWords } from "./helpers/word-list";

export default async function Command() {
  const preferences = getPreferenceValues<Preferences.GeneratePassphrase>();

  let format: string;

  try {
    format = resolvePassphraseFormat(preferences);
  } catch (error) {
    await showFailureToast("Invalid Passphrase Settings", getErrorMessage(error));
    return;
  }

  const formatErrors = validatePassphraseFormat(format);

  if (formatErrors.length > 0) {
    await showFailureToast("Invalid Passphrase Format", formatErrors[0]);
    return;
  }

  let generatedPassphrase: string;

  try {
    const dictionaryWords = loadDictionaryWordsIfNeeded(format);
    if (!(await confirmPassphraseStrength(passphraseEntropyBits(format, dictionaryWords?.length ?? 0)))) {
      return;
    }
    generatedPassphrase = generatePassphrase(format, dictionaryWords);
  } catch (error) {
    await showFailureToast("Could Not Generate Passphrase", getErrorMessage(error));
    return;
  }

  await copyGeneratedSecret(generatedPassphrase, "Passphrase", preferences);
}

function loadDictionaryWordsIfNeeded(format: string): string[] | undefined {
  if (!passphraseFormatUsesWords(format)) {
    return undefined;
  }

  const { words } = loadPassphraseWords({
    bundledWordListPath: path.join(environment.assetsPath, EFF_WORD_LIST_FILE_NAME),
  });

  return words;
}
