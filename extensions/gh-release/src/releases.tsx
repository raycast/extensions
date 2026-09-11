import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  Keyboard,
  open,
  showToast,
} from "@raycast/api";
import { useExec } from "@raycast/utils";
import { execFile } from "child_process";
import { existsSync } from "fs";
import { promisify } from "util";
import { nextTag, type Bump } from "./version";

const run = promisify(execFile);

// ponytail: Raycast doesn't inherit the login shell PATH
const GH =
  ["/opt/homebrew/bin/gh", "/usr/local/bin/gh", "/usr/bin/gh"].find(
    existsSync,
  ) ?? "gh";

const BUMPS: Bump[] = ["patch", "minor", "major"];
// ponytail: patch is the primary action (Enter), so it needs no shortcut of its own
const SHORTCUTS: Record<Bump, Keyboard.Shortcut | undefined> = {
  patch: undefined,
  minor: { modifiers: ["cmd", "shift"], key: "m" },
  major: { modifiers: ["cmd", "shift"], key: "j" },
};

type Repo = {
  nameWithOwner: string;
  description: string | null;
  pushedAt: string;
  isArchived: boolean;
};

async function latestTag(repo: string): Promise<string> {
  try {
    const { stdout } = await run(GH, [
      "release",
      "view",
      "--repo",
      repo,
      "--json",
      "tagName",
      "-q",
      ".tagName",
    ]);
    return stdout.trim();
  } catch {
    return ""; // no releases yet
  }
}

async function release(repo: string, bump: Bump) {
  const checking = await showToast({
    style: Toast.Style.Animated,
    title: "Reading latest release…",
  });
  const last = await latestTag(repo);
  const tag = nextTag(last, bump);
  await checking.hide();

  // ponytail: refuse rather than guess — bumping "nightly" would look like a regression
  if (!tag) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Latest release "${last}" isn't semver`,
      message: "Tag this one manually, then Raycast can take over",
    });
    return;
  }

  const confirmed = await confirmAlert({
    title: `Create ${tag}?`,
    message: `${repo}\nPrevious release: ${last || "none"}`,
    icon: Icon.Rocket,
    primaryAction: {
      title: `Create ${tag}`,
      style: Alert.ActionStyle.Destructive,
    },
  });
  if (!confirmed) return;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Creating ${tag}…`,
    message: repo,
  });
  try {
    const { stdout } = await run(GH, [
      "release",
      "create",
      tag,
      "--repo",
      repo,
      "--title",
      tag,
      "--generate-notes",
    ]);
    const url = stdout.trim().split("\n").pop() ?? "";
    toast.style = Toast.Style.Success;
    toast.title = `Released ${tag}`;
    toast.message = repo;
    if (url.startsWith("http")) {
      toast.primaryAction = {
        title: "Open Release",
        onAction: () => open(url),
      };
    }
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = `Could not create ${tag}`;
    toast.message = (err instanceof Error ? err.message : String(err))
      .split("\n")
      .slice(-2)
      .join(" ")
      .slice(0, 200);
  }
}

export default function Command() {
  const owner = getPreferenceValues<{ owner?: string }>().owner?.trim() ?? "";

  const { isLoading, data, revalidate, error } = useExec(
    GH,
    [
      "repo",
      "list",
      // ponytail: bare `gh repo list` already means "my repos"
      ...(owner ? [owner] : []),
      "--limit",
      "100",
      "--no-archived",
      "--json",
      "nameWithOwner,description,pushedAt,isArchived",
    ],
    {
      parseOutput: ({ stdout }) =>
        (JSON.parse(stdout || "[]") as Repo[])
          .filter((r) => !r.isArchived)
          .sort((a, b) => b.pushedAt.localeCompare(a.pushedAt)),
      failureToastOptions: {
        title: owner ? `Could not list ${owner} repos` : "Could not list repos",
        message: "Is the gh CLI installed and logged in?",
      },
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={
        owner ? `Search ${owner} repos…` : "Search your repos…"
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not reach GitHub"
          description="Install the gh CLI, then run: gh auth login"
        />
      ) : null}
      {!error && !isLoading && data?.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No repos found"
          description={
            owner
              ? `${owner} has no unarchived repos you can see. Check the GitHub Owner preference.`
              : "You have no unarchived repos. Set the GitHub Owner preference to list someone else's."
          }
        />
      ) : null}
      {(data ?? []).map((repo) => (
        <List.Item
          key={repo.nameWithOwner}
          icon={{ source: Icon.Rocket, tintColor: Color.PrimaryText }}
          title={repo.nameWithOwner.split("/")[1]}
          subtitle={repo.description ?? undefined}
          accessories={[
            { date: new Date(repo.pushedAt), tooltip: "Last push" },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section title={repo.nameWithOwner}>
                {BUMPS.map((bump) => (
                  <Action
                    key={bump}
                    title={`Release ${bump[0].toUpperCase()}${bump.slice(1)}`}
                    icon={Icon.Rocket}
                    shortcut={SHORTCUTS[bump]}
                    onAction={() => release(repo.nameWithOwner, bump)}
                  />
                ))}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.OpenInBrowser
                  title="Open Releases on GitHub"
                  url={`https://github.com/${repo.nameWithOwner}/releases`}
                />
                <Action.CopyToClipboard
                  title="Copy Repo Name"
                  content={repo.nameWithOwner}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
