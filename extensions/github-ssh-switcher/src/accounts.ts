/**
 * Account type and runtime account list.
 *
 * Accounts are read from Raycast extension preferences so each user can
 * configure their own GitHub identities without touching the source code.
 * Up to four account slots are supported; any slot whose Name field is left
 * blank in preferences is silently omitted from the list.
 */

import { getPreferenceValues } from "@raycast/api";

/** A GitHub account with its associated SSH configuration. */
export interface Account {
  /** Display name shown in the Raycast list. */
  title: string;
  /** Email address or GitHub username — shown as subtitle. */
  subtitle: string;
  /**
   * Path to the SSH private key. Tilde notation (`~/`) is supported.
   * The matching public key must be registered in the GitHub account.
   */
  keyPath: string;
  /**
   * `Host` alias defined in `~/.ssh/config` that resolves to github.com.
   * Example entry:
   *
   *   Host github-work
   *     HostName github.com
   *     User git
   *     IdentityFile ~/.ssh/id_ed25519_github_work
   */
  host: string;
}

interface Preferences {
  account1Title: string;
  account1Subtitle: string;
  account1KeyPath: string;
  account1Host: string;
  account2Title: string;
  account2Subtitle: string;
  account2KeyPath: string;
  account2Host: string;
  account3Title: string;
  account3Subtitle: string;
  account3KeyPath: string;
  account3Host: string;
  account4Title: string;
  account4Subtitle: string;
  account4KeyPath: string;
  account4Host: string;
}

/** Returns the accounts configured in Raycast extension preferences. */
export function getAccounts(): Account[] {
  const p = getPreferenceValues<Preferences>();
  return [
    { title: p.account1Title, subtitle: p.account1Subtitle, keyPath: p.account1KeyPath, host: p.account1Host },
    { title: p.account2Title, subtitle: p.account2Subtitle, keyPath: p.account2KeyPath, host: p.account2Host },
    { title: p.account3Title, subtitle: p.account3Subtitle, keyPath: p.account3KeyPath, host: p.account3Host },
    { title: p.account4Title, subtitle: p.account4Subtitle, keyPath: p.account4KeyPath, host: p.account4Host },
  ].filter((a) => Boolean(a.title && a.keyPath && a.host));
}
