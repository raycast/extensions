import { getPreferenceValues } from "@raycast/api";
import { Generated } from "./lib/types";

export function preferences() {
  const prefs = getPreferenceValues<Preferences>();
  const domain = (prefs.emailDomain ?? "").trim().replace(/^@/, "");
  return {
    copyFormat: prefs.copyFormat ?? "compact",
    phoneMode: prefs.phoneMode ?? "fictional",
    emailDomain: domain || "example.com",
  };
}

/** The value the primary "Copy" action uses, based on the Copy Format preference. */
export function preferredValue(value: Generated): string {
  return preferences().copyFormat === "formatted" ? value.formatted : value.compact;
}
