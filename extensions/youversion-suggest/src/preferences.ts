import { LocalStorage } from "@raycast/api";
import { getBibleData } from "youversion-suggest";
import defaultPreferences from "./default-preferences.json";

export async function getPreferenceValue<T extends LocalStorage.Value>(id: string): Promise<T | undefined> {
  return LocalStorage.getItem(id);
}

export async function setPreferenceValue<T extends LocalStorage.Value>(id: string, newValue: T): Promise<void> {
  return LocalStorage.setItem(id, newValue);
}

export async function getPreferredLanguage(): Promise<string> {
  return (await getPreferenceValue<string>("yvs-language")) || defaultPreferences.language;
}

export async function setPreferredLanguage(newLanguageId: string): Promise<void> {
  await setPreferenceValue<string>("yvs-language", newLanguageId);
  // When the language changes, the version must also change to the default
  // version; that logic is baked into getPreferredVersion(), so we can simply
  // persist the latest return value of that function
  return setPreferenceValue<number>("yvs-version", await getPreferredVersion());
}

export async function getPreferredVersion(): Promise<number> {
  const preferredLanguageId = await getPreferredLanguage();
  const bible = await getBibleData(preferredLanguageId);
  const preferredVersionId = await getPreferenceValue<number>("yvs-version");
  return bible.versions.find((version) => version.id === preferredVersionId)?.id || bible.default_version;
}

export async function setPreferredVersion(newVersionId: number): Promise<void> {
  return setPreferenceValue<number>("yvs-version", newVersionId);
}

export async function getDefaultReferenceFormat(): Promise<string> {
  return defaultPreferences.refformat;
}

export async function getPreferredReferenceFormat(): Promise<string> {
  // Because the field in the Preferences UI is a controlled input that is also
  // free-form, we must be able to allow empty values for this preference so
  // that the user is able to enter an empty value (even though an empty value
  // is technically invalid)
  const referenceFormat = await getPreferenceValue<string>("yvs-refformat");
  if (referenceFormat === undefined) {
    return defaultPreferences.refformat;
  } else if (referenceFormat) {
    return referenceFormat;
  } else {
    return "";
  }
}

export async function setPreferredReferenceFormat(newReferenceFormat: string): Promise<void> {
  await setPreferenceValue<string>("yvs-refformat", newReferenceFormat);
}

export async function getPreferredVerseNumbersSetting(): Promise<boolean> {
  return Boolean((await getPreferenceValue<boolean>("yvs-versenumbers")) ?? defaultPreferences.versenumbers);
}
export async function setPreferredVerseNumbersSetting(newValue: boolean): Promise<void> {
  await setPreferenceValue<boolean>("yvs-versenumbers", newValue);
}

export async function getPreferredLineBreaksSetting(): Promise<boolean> {
  return Boolean((await getPreferenceValue<boolean>("yvs-linebreaks")) ?? defaultPreferences.linebreaks);
}
export async function setPreferredLineBreaksSetting(newValue: boolean): Promise<void> {
  await setPreferenceValue<boolean>("yvs-linebreaks", newValue);
}
