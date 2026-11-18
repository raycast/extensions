// Account colors from `accounts --json`, and which one a list row gets.
//
// No Raycast imports here: this file runs under `node --test` as-is.

import type { AccountsResult } from "./types";

/// Account and shared-inbox colors keyed by lowercased address. Empty when
/// color coding is off in Spark: the CLI then leaves every `color` out.
export function accountColors(result: AccountsResult | undefined): Map<string, string> {
  const colors = new Map<string, string>();
  for (const account of result?.accounts ?? []) {
    if (account.color) colors.set(account.email.toLowerCase(), account.color);
    for (const team of account.teams) {
      for (const inbox of team.shared_inboxes) {
        if (inbox.color) colors.set(inbox.email.toLowerCase(), inbox.color);
      }
    }
  }
  return colors;
}

/// The ring color for a row: its receiving account, or - for topic search
/// matches, which carry recipients instead - the first of the user's own
/// addresses among them. A titled shared inbox or a team thread has neither.
export function rowColor(colors: Map<string, string>, account?: string, recipients: string[] = []): string | undefined {
  for (const address of [account, ...recipients]) {
    const color = address && colors.get(address.toLowerCase());
    if (color) return color;
  }
  return undefined;
}
