export type Repo = {
  nameWithOwner: string;
  description: string | null;
  pushedAt: string;
};

type ApiRepo = {
  full_name: string;
  description: string | null;
  pushed_at: string;
  archived: boolean;
  permissions?: { push?: boolean };
};

/**
 * Releasable repos from `gh api --paginate user/repos`, newest push first.
 * `owner` narrows to one user/org; blank keeps everything.
 */
export function parseRepos(stdout: string, owner: string): Repo[] {
  const wanted = owner.trim().toLowerCase();
  return (JSON.parse(stdout || "[]") as ApiRepo[])
    .filter((r) => !r.archived && r.permissions?.push)
    .filter(
      (r) => !wanted || r.full_name.split("/")[0].toLowerCase() === wanted,
    )
    .map((r) => ({
      nameWithOwner: r.full_name,
      description: r.description,
      pushedAt: r.pushed_at,
    }))
    .sort((a, b) => b.pushedAt.localeCompare(a.pushedAt));
}
