import { Octokit } from "@octokit/rest";
import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import fetch from "node-fetch";

interface Preferences {
  historyHours: string;
}

let octokit: Octokit | null = null;
let authPromise: Promise<Octokit> | null = null;

function onAuthorize({ token, type }: { token: string; type: string }) {
  console.log("Authorized with token type:", type);
  octokit = new Octokit({
    auth: token,
    request: { fetch },
  });
}

export const githubOAuthService = OAuthService.github({
  scope: "repo,user,workflow",
  onAuthorize,
});

export async function getGitHubClient(): Promise<Octokit> {
  if (octokit) return octokit;

  if (authPromise) return authPromise;

  authPromise = (async () => {
    try {
      console.log("Authorizing with GitHub...");
      const token = await githubOAuthService.authorize();
      console.log("Got token, initializing client...");
      octokit = new Octokit({
        auth: token,
        request: { fetch },
      });
      return octokit;
    } catch (error) {
      console.error("GitHub authorization failed:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to connect to GitHub",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    } finally {
      authPromise = null;
    }
  })();

  return authPromise;
}

export async function getRecentWorkflowRuns() {
  try {
    const octokit = await getGitHubClient();
    const { historyHours } = getPreferenceValues<Preferences>();

    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 10,
    });

    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - parseInt(historyHours || "24", 10));

    const runs = await Promise.all(
      repos.map(async (repo) => {
        try {
          const { data } = await octokit.actions.listWorkflowRunsForRepo({
            owner: repo.owner.login,
            repo: repo.name,
            per_page: 10,
          });

          const latestRuns = new Map();
          data.workflow_runs
            .filter((run) => new Date(run.created_at) > cutoffTime) // Only include runs from last 24h
            .forEach((run) => {
              const key = `${repo.full_name}:${run.workflow_id}`;
              if (!latestRuns.has(key) || new Date(run.created_at) > new Date(latestRuns.get(key).created_at)) {
                latestRuns.set(key, {
                  id: run.id,
                  name: run.name || run.display_title,
                  status: run.status || "unknown",
                  conclusion: run.conclusion,
                  created_at: run.created_at,
                  html_url: run.html_url,
                  repository: repo.full_name,
                  display_title: run.display_title,
                });
              }
            });

          return Array.from(latestRuns.values());
        } catch (error) {
          console.error(`Failed to fetch runs for ${repo.full_name}:`, error);
          return [];
        }
      }),
    );

    return runs
      .flat()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);
  } catch (error) {
    console.error("Failed to fetch workflow runs:", error);
    throw error;
  }
}
