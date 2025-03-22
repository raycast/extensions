import { Octokit } from "@octokit/rest";

/**
 *
 * @param scopes {string | string[]} Required scopes
 * @param octokit {Octokit} Octokit instance
 * @param andOrOr {boolean} If true, all scopes are required, otherwise at least one scope is required
 * @returns
 */
export const hasRequiredScopes = async (scopes: string | string[], octokit: Octokit, andOrOr = false) => {
  const { headers } = await octokit.request("GET /user");
  const userScopes = (headers["x-oauth-scopes"] || "").split(",").map((scope: string) => scope.trim());
  const requiredScopes = Array.isArray(scopes) ? scopes : [scopes];

  if (andOrOr) {
    return requiredScopes.every((scope) => userScopes.includes(scope));
  }

  return requiredScopes.some((scope) => userScopes.includes(scope));
};
