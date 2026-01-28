import { useFetch } from "@raycast/utils";
import type { PreferencesState, GithubRepository } from "../types";

/**
 * Checks the validity and scopes of a GitHub token.
 *
 * @param token - The GitHub token to check.
 * @returns An object containing the validity of the token and its scopes.
 */
export async function checkTokenScopes(
  token: string,
): Promise<{ valid: boolean; scopes: string[] }> {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: { Authorization: `token ${token}` },
    });

    if (!res.ok) return { valid: false, scopes: [] };

    const scopes =
      res.headers
        .get("x-oauth-scopes")
        ?.split(",")
        .map((s) => s.trim()) || [];

    // Only allow tokens with repo scope and no dangerous write/admin scopes
    const dangerousScopes = [
      "delete_repo",
      "workflow",
      "admin:org",
      "write:repo_hook",
    ];
    const hasDangerousScope = scopes.some((s) => dangerousScopes.includes(s));

    return { valid: !hasDangerousScope, scopes };
  } catch {
    return { valid: false, scopes: [] };
  }
}

export function useGithubRepos(query: string, preferences: PreferencesState) {
  const orgs = preferences.organizations
    .split(",")
    .map((org) => org.trim())
    .filter(Boolean);

  const buildQuery = (text: string) => {
    const trimmed = text.trim();

    const orgQueries = orgs.map((org) => `org:${org}`).join(" ");

    if (!trimmed || trimmed === "*") return orgQueries;

    return [trimmed, orgQueries].filter(Boolean).join(" ");
  };

  const fullQuery = buildQuery(query);

  const { data, isLoading, error } = useFetch<GithubRepository[]>(
    `https://api.github.com/search/repositories?q=${encodeURIComponent(fullQuery)}&sort=stars&order=desc&per_page=30`,
    {
      execute: Boolean(fullQuery),
      headers: {
        Accept: "application/vnd.github.v3+json",
        ...(preferences.githubToken
          ? { Authorization: `token ${preferences.githubToken}` }
          : {}),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mapResult(result: any) {
        if (result.items.length) {
          return {
            data: result.items.map((item: GithubRepository) => ({
              ...item,
            })),
          };
        }
        return { data: [] };
      },
      keepPreviousData: true,
    },
  );

  return { repositories: data || [], isLoading, error };
}
