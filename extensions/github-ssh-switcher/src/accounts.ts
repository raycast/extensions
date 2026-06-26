/**
 * Account definitions for the GitHub SSH Switcher.
 *
 * To add or remove accounts, edit the ACCOUNTS array below.
 * Each entry requires a private key file and a Host alias in ~/.ssh/config.
 */

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
   *     IdentityFile ~/.ssh/id_rsa_github_work
   */
  host: string;
}

/** Configured GitHub accounts available in the switcher. */
export const ACCOUNTS: Account[] = [
  {
    title: "RSG group",
    subtitle: "rsg.group@uah.es",
    keyPath: "~/.ssh/id_rsa_githubRSG",
    host: "github-rsg",
  },
  {
    title: "Julia Clemente P",
    subtitle: "juliaclementep@gmail.com",
    keyPath: "~/.ssh/id_rsa_githubJulia",
    host: "github-julia",
  },
  {
    title: "Personal",
    subtitle: "RicardoChocanoDelCerro",
    keyPath: "~/.ssh/id_rsa_githubpersonal",
    host: "github-personal",
  },
  {
    title: "Universidad",
    subtitle: "RicardoChocano",
    keyPath: "~/.ssh/id_rsa_githubuniversidad",
    host: "github-universidad",
  },
];
