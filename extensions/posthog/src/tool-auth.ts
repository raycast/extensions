type ToolAccount = {
  id: string;
};

export function requireAccountId(accountId: string | undefined): string {
  if (!accountId) {
    throw new Error("Missing accountId. Run list-projects first, then pass the accountId for the connected account.");
  }

  return accountId;
}

export function requireProjectId(projectId: number | undefined): number {
  if (typeof projectId !== "number" || !Number.isInteger(projectId) || projectId <= 0) {
    throw new Error("Missing projectId. Run list-projects first, then pass the numeric projectId.");
  }

  return projectId;
}

export function resolveToolAccount<TAccount extends ToolAccount>(
  accounts: TAccount[],
  accountId: string | undefined,
): TAccount {
  const resolvedAccountId = requireAccountId(accountId);

  if (accounts.length === 0) {
    throw new Error("No PostHog accounts are connected. Open Manage Accounts and connect a PostHog account.");
  }

  const account = accounts.find((candidate) => candidate.id === resolvedAccountId);

  if (!account) {
    throw new Error(`Unknown accountId "${resolvedAccountId}". Run list-projects to see connected account IDs.`);
  }

  return account;
}
