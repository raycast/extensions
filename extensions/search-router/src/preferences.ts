import { getPreferenceValues } from "@raycast/api";

export function getEngineTriggerPreference() {
  const prefix = (getPreferenceValues<Preferences>().engineTriggerPrefix ?? "!").trim();
  const invalid = prefix === "@" || /\s/.test(prefix);
  return {
    triggerPrefix: invalid ? "!" : prefix,
    warning: invalid
      ? "Using ! instead. @ is reserved for sites, and engine prefixes cannot contain whitespace."
      : undefined,
  };
}
