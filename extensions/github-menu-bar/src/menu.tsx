import {
  MenuBarExtra,
  open,
  getPreferenceValues,
  LocalStorage,
  environment,
  LaunchType,
  updateCommandMetadata,
  showToast,
  Toast,
  openCommandPreferences,
  Image,
} from "@raycast/api";
import { useState, useEffect, Fragment } from "react";
import { Octokit } from "octokit";
import { Endpoints } from "@octokit/types";

const { githubPAT, githubRepo } = getPreferenceValues();
const [owner, repo] = githubRepo.split("/");

const maxNumberOfCommitsFetched = 100;
const numberOfDisplayCommits = 25;

const octokit = initOctokit({ auth: githubPAT });

export default function Command() {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [unseenState, setUnseenState] = useState<{ old: number; new: number }>({ old: 0, new: 0 });
  // keep the icon as non-derived state since we want to update it independently
  const [menuIcon, setMenuIcon] = useState<Image.ImageLike>(defaultMenuIcon());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        if (!validatePreferences()) {
          return;
        }
        const commits = await fetchLatestCommits();
        let state = await fetchRepoState(commits);
        const unseenCommits = state.unseen; // store here to use state value in rendering
        if (environment.launchType == LaunchType.UserInitiated) {
          showUnseenCommitsToast(unseenCommits);
          // menu has been opened manually, reset state
          state = { shas: commits.map((item) => item.sha), unseen: 0 };
        }
        await persistState(state);
        await updateSubtitle(state.unseen);
        setMenuIcon(state.unseen > 0 ? MenuIcon.Unseen : defaultMenuIcon());
        setUnseenState({ new: state.unseen, old: unseenCommits });
        setCommits(commits.slice(0, numberOfDisplayCommits));
        setIsLoading(false);
      } catch (error) {
        console.error("Failed updating commits", error);
        setIsLoading(false);
        throw error;
      }
    })();
  }, []);

  const tooltip =
    commits.length > 0 && unseenState.new > 0
      ? `${String(unseenState.new)} unseen ${unseenState.new === 1 ? "commit" : "commits"}`
      : "No unseen commits";

  return (
    <MenuBarExtra icon={menuIcon} tooltip={tooltip} isLoading={isLoading}>
      {commits.length > 0 ? (
        <MenuBarExtra.Item key="unseen_commits_title" title={unseenState.old > 0 ? "Unseen Commits" : "Commits"} />
      ) : null}
      {commits.map((commit, index) => (
        <Fragment key={commit.sha}>
          {unseenState.old > 0 && index === unseenState.old ? (
            <MenuBarExtra.Item key="commits_title" title="Commits" />
          ) : null}
          <MenuBarExtra.Item
            key={commit.sha}
            icon={{ source: commit.avatarURL, fallback: "github-icon-dark.png", mask: Image.Mask.Circle }}
            title={commit.title}
            tooltip={`${commit.author} - ${commit.date.toLocaleDateString()} ${commit.date.toLocaleTimeString()}`}
            onAction={() => open(commit.url)}
          />
        </Fragment>
      ))}
      {commits.length > 0 ? <MenuBarExtra.Separator /> : null}
      <MenuBarExtra.Item
        key="preferences"
        title="Configure Command"
        tooltip="Open Command Preferences"
        onAction={() => openCommandPreferences()}
        shortcut={{ modifiers: ["cmd"], key: "," }}
      />
    </MenuBarExtra>
  );
}

function initOctokit(options: { auth: string }): Octokit {
  return new Octokit({
    auth: options.auth,
    throttle: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onRateLimit: (retryAfter: number, options: any) => {
        console.warn(`Request quota exhausted for request ${options.method} ${options.url}`);
        if (options.request.retryCount === 0) {
          console.info(`Retrying after ${retryAfter} seconds!`);
          return true;
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onSecondaryRateLimit: (retryAfter: number, options: any) => {
        console.warn(`SecondaryRateLimit detected for request ${options.method} ${options.url}`);
      },
    },
  });
}

async function fetchLatestCommits(): Promise<Commit[]> {
  type CommitsRequestsResponse = Endpoints["GET /repos/{owner}/{repo}/commits"]["response"];
  try {
    const { data: items }: CommitsRequestsResponse = await octokit.request("GET /repos/{owner}/{repo}/commits", {
      owner: owner,
      repo: repo,
      per_page: maxNumberOfCommitsFetched,
    });

    const commits = items.map((item) => {
      const commit = item.commit;
      const message = commit.message;
      // remove newlines and truncate
      const displayMessage = message.replace(/\n|\r/g, "").replace(/(.{80})..+/, "$1…");
      return {
        sha: item.sha,
        title: displayMessage,
        url: item.html_url,
        author: commit.author?.name ?? commit.committer?.name ?? "",
        avatarURL: item.author?.avatar_url ?? "",
        date: new Date(commit.author?.date ?? commit.committer?.date ?? ""),
      };
    });
    return commits;
  } catch {
    return [];
  }
}

async function fetchRepoState(commits: Commit[]): Promise<RepoState> {
  let state: RepoState;
  const stateString: string | undefined = await LocalStorage.getItem("repoState");
  if (stateString) {
    state = JSON.parse(stateString);
  } else {
    state = { shas: [], unseen: 0 };
  }

  const oldShas = new Set(state.shas);
  const newShas = new Set(commits.map((item) => item.sha));
  const addedShas = new Set([...newShas].filter((sha) => !oldShas.has(sha)));

  state.shas = Array.from(new Set([...oldShas, ...addedShas]));
  state.unseen += addedShas.size;

  return state;
}

async function persistState(state: RepoState) {
  LocalStorage.setItem("repoState", JSON.stringify(state));
}

async function updateSubtitle(unseen: number) {
  const subtitle = unseen > 0 ? `${String(unseen)} unseen ${unseen === 1 ? "commit" : "commits"}` : null;
  await updateCommandMetadata({ subtitle: subtitle });
}

async function showUnseenCommitsToast(unseen: number) {
  showToast(
    Toast.Style.Success,
    unseen > 0 ? `${String(unseen)} unseen ${unseen === 1 ? "commit" : "commits"}` : "No unseen commits"
  );
}

function validatePreferences(): boolean {
  if (githubRepo.trim().includes("/")) {
    return true;
  }
  showToast({
    title: "Invalid repository - enter owner/repo format in preferences",
    style: Toast.Style.Failure,
    primaryAction: {
      title: "Open Preferences",
      onAction: async () => {
        openCommandPreferences();
      },
    },
  });
  return false;
}

interface Commit {
  sha: string;
  title: string;
  url: string;
  author: string;
  avatarURL: string;
  date: Date;
}

interface RepoState {
  shas: string[];
  unseen: number;
}

enum MenuIcon {
  DefaultLight = "github-icon-light.png",
  DefaultDark = "github-icon-dark.png",
  Unseen = "github-icon-octocat.png",
}

function defaultMenuIcon(): Image.ImageLike {
  return {
    source: {
      light: MenuIcon.DefaultDark,
      dark: MenuIcon.DefaultLight,
    },
  };
}
