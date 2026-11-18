import { getAccessToken, useCachedPromise } from "@raycast/utils";
import { baseUrl } from "./auth";

export type Team = {
  slug: string;
  name: string;
  role: "owner" | "member" | "viewer";
  avatar_url: string | null;
  api_access: boolean;
  default: boolean;
};

export type TeamRef = { slug: string; name: string; avatar_url: string | null };

export type Project = {
  slug: string;
  name: string;
  path: string;
  url: string;
  source_type: "github" | "craft_cp";
  repository: string | null;
  production_branch: string | null;
  craft_version: string | null;
  sync_status: string | null;
  is_outdated: boolean;
  outdated_packages_count: number;
  urgent_packages_count: number;
  packages_count: number;
  last_synced_at: string | null;
  team: TeamRef;
};

export type Severity = "critical" | "high" | "moderate" | "low";

export type SecurityFix = {
  id: string | null;
  severity: Severity;
  title: string | null;
  url: string | null;
  version: string | null;
  source: "changelog" | "advisory";
};

export type Package = {
  name: string;
  display_name: string;
  type: string;
  installed_version: string | null;
  latest_compatible_version: string | null;
  latest_version: string | null;
  latest_available_version: string | null;
  has_major_available: boolean;
  constraint: string | null;
  is_dev: boolean;
  is_outdated: boolean;
  has_advisory: boolean;
  security_severity: Severity | null;
  security_fixes: SecurityFix[];
  is_critical: boolean;
  critical_changelog_url: string | null;
};

export type PackageUsage = {
  slug: string;
  path: string;
  name: string;
  url: string;
  installed_version: string | null;
  latest_compatible_version: string | null;
  is_outdated: boolean;
  has_advisory: boolean;
  security_severity: Severity | null;
  is_critical: boolean;
  team: TeamRef;
};

export type PullRequest = {
  number: number;
  url: string;
  branch: string;
  base_branch: string;
  title: string;
  state: "open" | "closed" | "merged" | string;
  auto_merged: boolean;
  merged_at: string | null;
  created_at: string | null;
};

export type Update = {
  id: string;
  display_id: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  type: "full" | "targeted";
  target_branch: string | null;
  error_message: string | null;
  project: string;
  url: string;
  triggered_by: { type: "user" | "schedule"; name: string };
  pull_requests: PullRequest[];
  created_at: string | null;
  completed_at: string | null;
  team: TeamRef;
};

export type MergeStrategy = {
  value: "pr_only" | "auto_merge_staging" | "auto_merge_all";
  label: string;
  description: string;
  default: boolean;
};

export type ProjectDetail = Omit<Project, "team"> & {
  merge_strategies: MergeStrategy[];
};

export type StartedUpdate = {
  data: Update;
  expected_changes: { name: string; from: string; to: string }[];
};

type Page<T> = {
  data: T[];
  meta?: { current_page: number; last_page: number };
};

/**
 * Every team-scoped call names its team, so a project or update always
 * goes back to the team it came from.
 */
export function apiUrl(
  path: string,
  query: Record<string, string> = {},
): string {
  return `${baseUrl()}/api/v1/${path}?${new URLSearchParams(query)}`;
}

function headers() {
  return {
    Authorization: `Bearer ${getAccessToken().token}`,
    Accept: "application/json",
  };
}

export async function getJson<T>(
  path: string,
  query: Record<string, string> = {},
): Promise<T> {
  const response = await fetch(apiUrl(path, query), { headers: headers() });
  const payload = (await response.json().catch(() => ({}))) as T & {
    message?: string;
  };

  if (!response.ok) {
    throw new Error(payload.message ?? `VerWatch answered ${response.status}`);
  }

  return payload;
}

/**
 * The teams this sign-in reaches through the API. A team on a plan without
 * API access would only answer 403, so it is left out.
 */
export async function fetchTeams(): Promise<Team[]> {
  const me = await getJson<{ data: { teams: Team[] } }>("me");
  const teams = me.data.teams.filter((team) => team.api_access);

  if (teams.length === 0) {
    throw new Error(
      "None of your teams is on a plan with API access. Upgrade to the Agency plan to use Raycast.",
    );
  }

  return teams;
}

async function allPages<T>(
  path: string,
  query: Record<string, string>,
): Promise<T[]> {
  const items: T[] = [];

  for (let page = 1; ; page++) {
    const result = await getJson<Page<T>>(path, {
      ...query,
      per_page: "100",
      page: String(page),
    });
    items.push(...result.data);

    if (!result.meta || result.meta.current_page >= result.meta.last_page) {
      return items;
    }
  }
}

/**
 * One list endpoint across every team, each item tagged with its team.
 * `pages: "all"` walks every page (projects); `pages: "first"` takes the
 * latest few (updates).
 */
async function acrossTeams<T>(
  path: string,
  query: Record<string, string>,
  pages: "all" | "first",
): Promise<{ teams: Team[]; items: (T & { team: TeamRef })[] }> {
  const teams = await fetchTeams();

  const perTeam = await Promise.all(
    teams.map(async (team) => {
      const teamQuery = { ...query, team: team.slug };
      const items =
        pages === "all"
          ? await allPages<T>(path, teamQuery)
          : (await getJson<Page<T>>(path, teamQuery)).data;

      return items.map((item) => ({
        ...item,
        team: {
          slug: team.slug,
          name: team.name,
          avatar_url: team.avatar_url,
        },
      }));
    }),
  );

  return { teams, items: perTeam.flat() };
}

export function useProjects(query: Record<string, string> = {}) {
  return useCachedPromise(
    async (q: Record<string, string>) => {
      const { teams, items } = await acrossTeams<Omit<Project, "team">>(
        "projects",
        q,
        "all",
      );

      return {
        teams,
        projects: items.sort((a, b) => a.name.localeCompare(b.name)),
      };
    },
    [query],
    { keepPreviousData: true },
  );
}

export function useUpdates(perTeam: number) {
  return useCachedPromise(
    async (count: number) => {
      const { teams, items } = await acrossTeams<Omit<Update, "team">>(
        "updates",
        { per_page: String(count) },
        "first",
      );

      return {
        teams,
        updates: items.sort((a, b) =>
          (b.created_at ?? "").localeCompare(a.created_at ?? ""),
        ),
      };
    },
    [perTeam],
    { keepPreviousData: true },
  );
}

export function usePackages(project: Project) {
  return useCachedPromise(
    async (path: string, team: string) =>
      (
        await getJson<{ data: Package[] }>(`projects/${path}/packages`, {
          team,
        })
      ).data,
    [project.path, project.team.slug],
    { keepPreviousData: true },
  );
}

/**
 * Every project using a package, across every team. A team none of whose
 * projects use it answers 404 and adds nothing.
 */
export function usePackageUsages(packageName: string) {
  return useCachedPromise(
    async (name: string) => {
      const teams = await fetchTeams();

      const perTeam = await Promise.all(
        teams.map(async (team) => {
          try {
            const result = await getJson<{
              data: { projects: Omit<PackageUsage, "team">[] };
            }>(`packages/${name}`, { team: team.slug });

            return result.data.projects.map((usage) => ({
              ...usage,
              team: {
                slug: team.slug,
                name: team.name,
                avatar_url: team.avatar_url,
              },
            }));
          } catch {
            return [];
          }
        }),
      );

      return {
        teams,
        usages: perTeam.flat().sort((a, b) => a.name.localeCompare(b.name)),
      };
    },
    [packageName],
    { keepPreviousData: true },
  );
}

export function packagePageUrl(packageName: string, team: string): string {
  return `${baseUrl()}/packages/${packageName}?${new URLSearchParams({ team })}`;
}

/**
 * Start an update run. VerWatch refuses a run it would waste (an update
 * pull request still open, nothing outdated) with a 422 whose message says
 * why, which is thrown as the error's message.
 */
export async function startUpdate(
  project: Project,
  body: { merge_strategy: string; scope: string },
): Promise<StartedUpdate> {
  const response = await fetch(
    apiUrl(`projects/${project.path}/updates`, { team: project.team.slug }),
    {
      method: "POST",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  const payload = (await response.json().catch(() => ({}))) as {
    message?: string;
  };

  if (!response.ok) {
    throw new Error(payload.message ?? `VerWatch answered ${response.status}`);
  }

  return payload as StartedUpdate;
}

/**
 * The org half of an `owner/slug` path.
 */
export function ownerOf(path: string): string {
  return path.split("/")[0];
}

/**
 * Whether a list spans more than one org, the only time a row needs to
 * say which org its project belongs to.
 */
export function spansOrgs(paths: string[]): boolean {
  return new Set(paths.map(ownerOf)).size > 1;
}

export function openPullRequests(update: Update): PullRequest[] {
  return update.pull_requests.filter((pr) => pr.state === "open");
}
