import { getPreferenceValues, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import { isReservedDomain, isValidDomain } from "./lib/people";
import { Generated } from "./lib/types";

const FALLBACK_EMAIL_DOMAIN = "example.com";

export function preferences() {
  const prefs = getPreferenceValues<Preferences>();
  const rawDomain = (prefs.emailDomain ?? "").trim().replace(/^@/, "").toLowerCase();
  const domainValid = isValidDomain(rawDomain);
  const emailDomain = domainValid ? rawDomain : FALLBACK_EMAIL_DOMAIN;
  return {
    copyFormat: prefs.copyFormat ?? "compact",
    phoneMode: prefs.phoneMode ?? "fictional",
    emailDomain,
    /** The preference value when it isn't a valid domain (example.com is used instead). */
    invalidEmailDomain: rawDomain && !domainValid ? rawDomain : undefined,
    /** False when the user picked a real domain: mail to generated addresses can then be delivered. */
    emailDomainReserved: isReservedDomain(emailDomain),
  };
}

/** Tells the user once per launch when the Email Domain preference was ignored. */
export function useEmailDomainWarning() {
  useEffect(() => {
    const { invalidEmailDomain } = preferences();
    if (!invalidEmailDomain) return;
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid email domain",
      message: `"${invalidEmailDomain}" isn't a domain, using ${FALLBACK_EMAIL_DOMAIN}`,
      primaryAction: { title: "Open Preferences", onAction: () => openExtensionPreferences() },
    });
  }, []);
}

/** The value the primary "Copy" action uses, based on the Copy Format preference. */
export function preferredValue(value: Generated): string {
  return preferences().copyFormat === "formatted" ? value.formatted : value.compact;
}
