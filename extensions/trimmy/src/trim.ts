import { runTrimCommand, getPreferences } from "./trim-core";

export default async function command(): Promise<void> {
  const preferences = getPreferences<Preferences.Trim>();
  await runTrimCommand("copy", preferences);
}
