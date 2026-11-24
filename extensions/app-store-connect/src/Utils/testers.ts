import { BetaTester } from "../Model/schemas";

/**
 * Display name for a beta tester.
 *
 * Testers who joined via a public link have no surname, so joining both fields left a
 * trailing space; testers added by email may have neither name yet. Both cases need a
 * stable label for list rows and ActionPanel section titles.
 */
export function betaTesterDisplayName(tester: BetaTester): string {
  if (tester.attributes.inviteType === "PUBLIC_LINK") {
    return tester.attributes.firstName ?? "Anonymous";
  }
  const name = [tester.attributes.firstName, tester.attributes.lastName].filter(Boolean).join(" ").trim();
  return name.length > 0 ? name : tester.attributes.email ?? "Unnamed Tester";
}
