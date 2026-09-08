import { Clipboard, getPreferenceValues, showHUD } from "@raycast/api";

export async function outputGeneratedValue(
  value: string,
  label: string,
  sensitive = false,
): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();
  const shouldCopy = sensitive || preferences.copy;
  const shouldInsert = !sensitive && preferences.insert;

  if (shouldCopy) {
    await Clipboard.copy(value);
  }
  if (shouldInsert) {
    await Clipboard.paste(value);
  }

  const destination = [shouldCopy && "copied", shouldInsert && "inserted"]
    .filter(Boolean)
    .join(" and ");
  const valueDescription = sensitive ? label : `${label} ${value}`;
  await showHUD(
    destination
      ? `${valueDescription} ${destination}`
      : `${valueDescription} generated`,
  );
}

export async function generateAndOutput(
  generate: () => string,
  label: string,
  sensitive = false,
): Promise<void> {
  try {
    await outputGeneratedValue(generate(), label, sensitive);
  } catch (error) {
    console.error(`Unable to generate ${label}`, error);
    await showHUD(`Unable to generate ${label}`);
  }
}
