export type PostHogRegion = "us" | "eu";

export type PostHogAccount = {
  id: string;
  providerId: string;
  clientId?: string;
  email?: string;
  name?: string;
  region: PostHogRegion;
  baseUrl: string;
  authBaseUrl: string;
  tokenEndpoint?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectSelection = {
  accountId: string;
  projectId: string;
};

type ProjectLike = {
  id: string | number;
};

export type AccountProjectGroup<TProject extends ProjectLike = ProjectLike> = {
  account: PostHogAccount;
  projects: TProject[];
};

export function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function accountLabel(account: PostHogAccount): string {
  const region = account.region.toUpperCase();

  if (account.email) {
    return `${account.email} (${region})`;
  }

  if (account.name) {
    return `${account.name} (${region})`;
  }

  return `${region} - ${account.baseUrl}`;
}

export function upsertAccount(accounts: PostHogAccount[], account: PostHogAccount): PostHogAccount[] {
  const existingIndex = accounts.findIndex((existingAccount) => existingAccount.id === account.id);

  if (existingIndex === -1) {
    return [...accounts, account];
  }

  return accounts.map((existingAccount, index) => (index === existingIndex ? account : existingAccount));
}

export function removeAccountFromList(accounts: PostHogAccount[], accountId: string): PostHogAccount[] {
  return accounts.filter((account) => account.id !== accountId);
}

export function encodeProjectSelection(accountId: string, projectId: string | number): string {
  return `${accountId}:${projectId}`;
}

export function decodeProjectSelection(value: string): ProjectSelection | null {
  const [accountId, projectId, ...extraParts] = value.split(":");

  if (!accountId || !projectId || extraParts.length > 0) {
    return null;
  }

  return { accountId, projectId };
}

export function isProjectSelectionValueAvailable<TProject extends ProjectLike>(
  groups: AccountProjectGroup<TProject>[],
  value: string | null
): boolean {
  if (!value) {
    return false;
  }

  const selection = decodeProjectSelection(value);

  if (!selection) {
    return false;
  }

  return groups.some(
    (group) =>
      group.account.id === selection.accountId &&
      group.projects.some((project) => project.id.toString() === selection.projectId)
  );
}

export function firstProjectSelectionValue<TProject extends ProjectLike>(
  groups: AccountProjectGroup<TProject>[]
): string | null {
  const group = groups.find((group) => group.projects.length > 0);
  const project = group?.projects[0];

  return group && project ? encodeProjectSelection(group.account.id, project.id) : null;
}
