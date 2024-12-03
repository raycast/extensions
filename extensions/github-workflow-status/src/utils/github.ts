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

  if (authPromise) {
    console.log("Auth already in progress, waiting...");
    return authPromise;
  }

  authPromise = (async () => {
    try {
      console.log("Starting GitHub authorization...");
      const token = await githubOAuthService.authorize();

      if (octokit) {
        console.log("Client already initialized by another auth");
        return octokit;
      }

      console.log("Initializing GitHub client...");
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

    let repos: Awaited<ReturnType<typeof octokit.repos.listForAuthenticatedUser>>["data"] = [];
    let page = 1;
    let hasMoreRepos = true;
    while (hasMoreRepos) {
      const { data: repoPage } = await octokit.repos.listForAuthenticatedUser({
        sort: "pushed",
        direction: "desc",
        per_page: 100,
        page,
      });

      if (repoPage.length === 0) {
        hasMoreRepos = false;
      } else {
        repos = repos.concat(repoPage);
        page++;
      }

      const runsCount = (
        await Promise.all(
          repos.map(async (repo) => {
            try {
              const { data } = await octokit.actions.listWorkflowRunsForRepo({
                owner: repo.owner.login,
                repo: repo.name,
                per_page: 1,
                created: `>=${new Date(Date.now() - parseInt(historyHours || "24", 10) * 60 * 60 * 1000).toISOString()}`,
              });
              return data.total_count;
            } catch {
              return 0;
            }
          }),
        )
      ).reduce((sum, count) => sum + count, 0);

      if (runsCount >= 10) {
        hasMoreRepos = false;
      }
    }

    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - parseInt(historyHours || "24", 10));
    const cutoffTimeString = cutoffTime.toISOString();

    const runs = await Promise.all(
      repos.map(async (repo) => {
        try {
          let allWorkflowRuns: Awaited<
            ReturnType<typeof octokit.actions.listWorkflowRunsForRepo>
          >["data"]["workflow_runs"] = [];
          page = 1;
          let hasMoreRuns = true;

          while (hasMoreRuns) {
            const { data } = await octokit.actions.listWorkflowRunsForRepo({
              owner: repo.owner.login,
              repo: repo.name,
              per_page: 100,
              page,
              created: `>=${cutoffTimeString}`,
            });

            if (data.workflow_runs.length === 0) {
              hasMoreRuns = false;
            } else {
              allWorkflowRuns = allWorkflowRuns.concat(data.workflow_runs);
              page++;
            }
          }

          const latestRuns = new Map();
          allWorkflowRuns.forEach((run) => {
            const key = `${repo.full_name}:${run.workflow_id}`;
            if (!latestRuns.has(key) || new Date(run.created_at) > new Date(latestRuns.get(key).created_at)) {
              latestRuns.set(key, {
                id: run.id,
                name: run.name,
                status: run.status || "unknown",
                conclusion: run.conclusion,
                created_at: run.created_at,
                html_url: run.html_url,
                repository: repo.full_name,
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
