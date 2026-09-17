import type { AccountEntry } from "../accounts/types.ts";

export interface CopilotAccountCandidate {
  id: string;
  label: string;
  token: string;
}

interface BuildCopilotAccountCandidatesOptions {
  manualAccounts: AccountEntry[];
  preferenceToken?: string;
  cliToken?: string | null;
  githubToken?: string | null;
  ghToken?: string | null;
}

export function buildCopilotAccountCandidates({
  manualAccounts,
  preferenceToken,
  cliToken,
  githubToken,
  ghToken,
}: BuildCopilotAccountCandidatesOptions): CopilotAccountCandidate[] {
  const accounts: CopilotAccountCandidate[] = [];
  const seenTokens = new Set<string>();

  const addAccount = (account: CopilotAccountCandidate): void => {
    const token = account.token.trim();
    if (!token || seenTokens.has(token)) return;
    seenTokens.add(token);
    accounts.push({ ...account, token });
  };

  for (const account of manualAccounts) {
    addAccount(account);
  }

  addAccount({ id: "copilot-pref", label: "Preference", token: preferenceToken ?? "" });
  addAccount({ id: "copilot-gh-cli", label: "GitHub CLI", token: cliToken ?? "" });
  addAccount({ id: "copilot-github-env", label: "GITHUB_TOKEN", token: githubToken ?? "" });
  addAccount({ id: "copilot-gh-env", label: "GH_TOKEN", token: ghToken ?? "" });

  return accounts;
}
