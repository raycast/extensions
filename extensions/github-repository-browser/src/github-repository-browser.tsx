import {
  ActionPanel,
  Action,
  Cache,
  Detail,
  Icon,
  Image,
  List,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedState, useFetch, usePromise } from "@raycast/utils";

const USER_REPOS_KEY = "__user__";
const cache = new Cache();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const RETRY_TTL = 5 * 60 * 1000;

interface User {
  login: string;
  avatar_url: string;
}

interface Organization {
  login: string;
  avatar_url: string;
}

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  clone_url: string;
  open_issues_count: number;
  stargazers_count: number;
  forks_count: number;
  private: boolean;
}

interface RepositoryWithCounts extends Repository {
  issues_count?: number;
  prs_count?: number;
}

interface CacheEntry {
  timestamp: number;
  data: RepositoryWithCounts[];
}

function getNextPageUrl(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  for (const link of linkHeader.split(",")) {
    const parts = link.split(";");
    const isNext = parts.some((part) => part.trim() === 'rel="next"');
    if (isNext) return parts[0].trim().slice(1, -1);
  }
  return null;
}

async function fetchAllPages(url: string, headers: Record<string, string>): Promise<Repository[]> {
  const results: Repository[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    const response = await fetch(nextUrl, { headers });
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    const data = (await response.json()) as Repository[];
    results.push(...data);
    nextUrl = getNextPageUrl(response.headers.get("Link"));
  }

  return results;
}

// Fetch the open issue count and open PR count for a repo in a single GraphQL query, so both
// numbers come from the same point-in-time snapshot on GitHub's side. Two separate REST calls
// (even fired concurrently) can each observe a different state if an issue or PR changes in
// between, producing an inconsistent, incorrect result. GraphQL also models issues and pull
// requests as distinct types, so no subtraction is needed to exclude PRs from the issue count.
async function getCounts(
  fullName: string,
  headers: Record<string, string>,
): Promise<{ prs: number | null; issues: number | null }> {
  const [owner, name] = fullName.split("/");
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          issues(states: OPEN) { totalCount }
          pullRequests(states: OPEN) { totalCount }
        }
      }`,
      variables: { owner, name },
    }),
  });
  if (!response.ok) return { prs: null, issues: null };
  const json = await response.json();
  const repository = json?.data?.repository;
  if (!repository || json.errors) return { prs: null, issues: null };
  return {
    prs: typeof repository.pullRequests?.totalCount === "number" ? repository.pullRequests.totalCount : null,
    issues: typeof repository.issues?.totalCount === "number" ? repository.issues.totalCount : null,
  };
}

async function enrichRepos(
  repos: Repository[],
  headers: Record<string, string>,
  previousRepos?: RepositoryWithCounts[],
  concurrency = 10,
): Promise<{ data: RepositoryWithCounts[]; hadFailures: boolean }> {
  const previousById = new Map(previousRepos?.map((repo) => [repo.id, repo]));
  const all: RepositoryWithCounts[] = [];
  let hadFailures = false;
  for (let i = 0; i < repos.length; i += concurrency) {
    const chunk = repos.slice(i, i + concurrency);
    const counts = await Promise.all(chunk.map((r) => getCounts(r.full_name, headers)));
    for (let j = 0; j < chunk.length; j++) {
      const repo = chunk[j];
      const { prs, issues } = counts[j];
      if (prs !== null && issues !== null) {
        all.push({ ...repo, prs_count: prs, issues_count: issues });
        continue;
      }
      // One or both counts failed to fetch (e.g. transient GitHub error). Fall back to the
      // previously cached counts for this repo instead of erasing or miscomputing them, and
      // flag this batch so the cache entry expires sooner and gets retried automatically.
      hadFailures = true;
      const previous = previousById.get(repo.id);
      all.push(
        previous ? { ...repo, prs_count: previous.prs_count, issues_count: previous.issues_count } : { ...repo },
      );
    }
  }
  return { data: all, hadFailures };
}

export default function Command() {
  const { token } = getPreferenceValues<Preferences.GithubRepositoryBrowser>();
  const [selectedOrg, setSelectedOrg] = useCachedState("selected-org", USER_REPOS_KEY);

  const headers = { Authorization: `Bearer ${token}` };

  const { data: user } = useFetch<User>("https://api.github.com/user", { headers });

  const { data: orgs, error: orgsError } = useFetch<Organization[]>("https://api.github.com/user/orgs", { headers });

  if (orgsError) {
    return (
      <Detail
        markdown={`# Access Denied\n\nGitHub returned: **${orgsError.message}**\n\nYour token needs the **read:org** scope to list organizations. Create a token with the \`read:org\` scope at the link below.`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url="https://github.com/settings/tokens" title="Open Token Settings" />
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  const isUserRepos = selectedOrg === USER_REPOS_KEY;
  const cacheKey = `repos-${selectedOrg}`;
  const reposUrl = isUserRepos
    ? "https://api.github.com/user/repos?per_page=100&sort=updated&direction=desc&type=owner"
    : `https://api.github.com/orgs/${selectedOrg}/repos?per_page=100&sort=updated&direction=desc`;
  const [cachedEntry, setCachedEntry] = useCachedState<CacheEntry | undefined>(cacheKey, undefined);
  const staleRepos = cachedEntry?.data;

  const {
    isLoading: isReposLoading,
    data: repos,
    revalidate,
  } = usePromise(
    async (key: string, url: string) => {
      const raw = cache.get(key);
      let previousEntry: CacheEntry | undefined;
      if (raw) {
        previousEntry = JSON.parse(raw) as CacheEntry;
        if (Date.now() - previousEntry.timestamp < CACHE_TTL) {
          return previousEntry.data;
        }
      }
      const rawRepos = await fetchAllPages(url, headers);
      const { data, hadFailures } = await enrichRepos(rawRepos, headers, previousEntry?.data);
      const entry: CacheEntry = {
        // If some repos failed to fetch fresh PR/issue counts, expire this entry sooner
        // so it's automatically retried on the next load instead of being stuck for a week.
        timestamp: hadFailures ? Date.now() - CACHE_TTL + RETRY_TTL : Date.now(),
        data,
      };
      setCachedEntry(entry);
      return data;
    },
    [cacheKey, reposUrl],
  );

  function handleRefresh() {
    if (cachedEntry) {
      setCachedEntry({ ...cachedEntry, timestamp: 0 });
    }
    revalidate();
  }

  return (
    <List
      isLoading={isReposLoading && !repos && !staleRepos}
      throttle
      searchBarPlaceholder="Search repositories..."
      searchBarAccessory={
        <List.Dropdown tooltip="Select repositories source" value={selectedOrg} onChange={setSelectedOrg}>
          {user && (
            <List.Dropdown.Item
              key={USER_REPOS_KEY}
              title={`${user.login} (personal)`}
              value={USER_REPOS_KEY}
              icon={{ source: user.avatar_url, mask: Image.Mask.Circle }}
            />
          )}
          {orgs?.map((org) => (
            <List.Dropdown.Item
              key={org.login}
              title={org.login}
              value={org.login}
              icon={{ source: org.avatar_url, mask: Image.Mask.Circle }}
            />
          ))}
        </List.Dropdown>
      }
    >
      {(repos ?? staleRepos)?.map((repo) => (
        <List.Item
          key={repo.id}
          icon={repo.private ? Icon.Lock : Icon.LockUnlocked}
          title={repo.name}
          subtitle={repo.description || ""}
          accessories={[
            ...(repo.issues_count && repo.issues_count > 0
              ? [{ icon: Icon.Bug, text: String(repo.issues_count) }]
              : []),
            ...(repo.prs_count && repo.prs_count > 0
              ? [{ icon: Icon.SpeechBubble, text: String(repo.prs_count) }]
              : []),
            ...(repo.stargazers_count > 0 ? [{ icon: Icon.Star, text: String(repo.stargazers_count) }] : []),
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser url={repo.html_url} icon={Icon.Globe} />
                <Action.OpenInBrowser
                  title="Open Pull Requests"
                  url={`https://github.com/${repo.full_name}/pulls`}
                  icon={Icon.SpeechBubble}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                />
                <Action.OpenInBrowser
                  title="Open Issues"
                  url={`https://github.com/${repo.full_name}/issues`}
                  icon={Icon.Bug}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CopyToClipboard content={repo.html_url} title="Copy URL" />
                <Action.CopyToClipboard content={`git clone ${repo.clone_url}`} title="Copy Clone URL" />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action title="Refresh Cache" icon={Icon.ArrowClockwise} onAction={handleRefresh} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
