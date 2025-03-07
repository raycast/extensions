import { getPreferenceValues, LaunchType, closeMainWindow, showToast, Toast, Cache } from "@raycast/api";
import { Octokit } from "@octokit/rest";
import { execSync } from "child_process";
import { setCachedPRs } from "./utils";
import micromatch from "micromatch";

interface Preferences {
  repositories: string;
  maxLines: string;
  maxAgeDays: string;
  ignorePatterns: string;
}

interface SmallPR {
  title: string;
  url: string;
  additions: number;
  deletions: number;
  repository: string;
  number: number;
  author: string;
  createdAt: string;
}

const cache = new Cache();
const FETCH_LOCK_KEY = "fetch-in-progress";

async function createOctokitWithSSH(): Promise<Octokit> {
  try {
    // Try to get stored GitHub token from git credentials
    const credentials = execSync("git credential fill", {
      input: "url=https://github.com\n\n",
      encoding: "utf8",
    });

    const match = /password=(.+)\n/.exec(credentials);
    const token = match?.[1];
    if (!token) {
      throw new Error("No GitHub token found in git credentials");
    }

    return new Octokit({ auth: token });
  } catch (error) {
    throw new Error("Failed to authenticate. Please store your GitHub token in git credentials");
  }
}

function isRecentPR(createdAt: string, maxAgeDays: number): boolean {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
  return new Date(createdAt) > cutoffDate;
}

export default async function command(props: { launchType: LaunchType }) {
  try {
    if (cache.get(FETCH_LOCK_KEY) === "true") {
      await closeMainWindow();
      return;
    }

    cache.set(FETCH_LOCK_KEY, "true");

    if (props.launchType === LaunchType.UserInitiated) {
      await closeMainWindow();
      await showToast({
        style: Toast.Style.Animated,
        title: `Fetching PRs...`,
      });
    }

    const preferences = getPreferenceValues<Preferences>();
    const octokit = await createOctokitWithSSH();
    const repositories = preferences.repositories.split(",").map((repo) => repo.trim());
    const maxLines = parseInt(preferences.maxLines || "50", 10);
    const maxAgeDays = parseInt(preferences.maxAgeDays || "30", 10);
    const ignorePatterns = preferences.ignorePatterns
      ? preferences.ignorePatterns
          .split(",")
          .map((pattern) => pattern.trim())
          .filter(Boolean)
      : [];

    const smallPRs: SmallPR[] = [];

    for (const repoPath of repositories) {
      const [owner, repo] = repoPath.split("/");

      const { data: pulls } = await octokit.pulls.list({
        owner,
        repo,
        state: "open",
        per_page: 100,
      });

      for (const pull of pulls) {
        if (pull.draft || !isRecentPR(pull.created_at, maxAgeDays)) continue;

        const { data: files } = await octokit.pulls.listFiles({
          owner,
          repo,
          pull_number: pull.number,
        });

        const relevantFiles = files.filter(
          (file) => !ignorePatterns.length || !micromatch.isMatch(file.filename, ignorePatterns),
        );
        const totalChanges = relevantFiles.reduce((acc, file) => acc + file.additions + file.deletions, 0);

        if (totalChanges <= maxLines) {
          smallPRs.push({
            title: pull.title,
            url: pull.html_url,
            additions: relevantFiles.reduce((acc, file) => acc + file.additions, 0),
            deletions: relevantFiles.reduce((acc, file) => acc + file.deletions, 0),
            repository: repoPath,
            number: pull.number,
            author: pull.user?.login ?? "unknown",
            createdAt: pull.created_at,
          });
        }
      }
    }

    const sortByDate = (a: SmallPR, b: SmallPR) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

    smallPRs.sort(sortByDate);
    setCachedPRs(smallPRs);

    if (smallPRs.length > 0) {
      if (props.launchType === LaunchType.Background) return;
      await showToast({
        style: Toast.Style.Success,
        title: `Found ${smallPRs.length} small PR${smallPRs.length > 1 ? "s" : ""}!`,
        message: smallPRs.map((pr) => `${pr.repository}: ${pr.title} (+${pr.additions}/-${pr.deletions})`).join("\n"),
      });
    }
  } catch (error) {
    if (props.launchType === LaunchType.Background) {
      console.error(error);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to check PRs",
        message: String(error),
      });
    }
  } finally {
    cache.remove(FETCH_LOCK_KEY);
  }
}
