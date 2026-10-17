import { getPreferenceValues } from "@raycast/api";

import { copyGeneratedSecret } from "./helpers/clipboard";
import { getErrorMessage, showFailureToast } from "./helpers/feedback";
import { generatePassword, resolvePasswordOptions } from "./helpers/password";

export default async function Command() {
  const preferences = getPreferenceValues<Preferences.GeneratePassword>();
  let password: string;

  try {
    password = generatePassword(resolvePasswordOptions(preferences));
  } catch (error) {
    await showFailureToast("Could Not Generate Password", getErrorMessage(error));
    return;
  }

  await copyGeneratedSecret(password, "Password", preferences);
}
