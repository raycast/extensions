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
  openExtensionPreferences,
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
};

// ponytail: `gh repo list <owner>` only returns repos that owner *owns*, which is
// empty for org-based accounts. Releasing needs push access, so ask for that instead.
// --paginate is load-bearing: the owner filter runs client-side, so capping at one
// page would hide that owner's repos rather than just trimming the tail.
const LIST_ARGS = [
  "api",
  "--paginate",
  "user/repos?affiliation=owner,organization_member,collaborator&sort=pushed&per_page=100",
  "--jq",
  "[.[] | select(.archived == false) | select(.permissions.push) |" +
    " {nameWithOwner: .full_name, description, pushedAt: .pushed_at}]",
];

/** Latest release tag, or "" when the repo genuinely has none. Throws otherwise. */
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
  } catch (err) {
    // ponytail: only a real "no releases" may become empty history. Swallowing an
    // auth or network failure here would propose v0.0.1 over an existing v4.x.
    const detail = `${(err as { stderr?: string })?.stderr ?? ""}\n${
      err instanceof Error ? err.message : String(err)
    }`;
    if (/release not found/i.test(detail)) return "";
    throw err;
  }
}

async function release(repo: string, bump: Bump) {
  const checking = await showToast({
    style: Toast.Style.Animated,
    title: "Reading latest release…",
  });
  let last: string;
  try {
    last = await latestTag(repo);
  } catch (err) {
    await checking.hide();
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not read the latest release",
      message: `${repo} — ${err instanceof Error ? err.message : String(err)}`
        .split("\n")
        .slice(-2)
        .join(" ")
        .slice(0, 200),
    });
    return;
  }
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

function PreferencesAction() {
  return (
    <ActionPanel>
      <Action
        title="Change GitHub Owner"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
    </ActionPanel>
  );
}

export default function Command() {
  const owner = getPreferenceValues<Preferences>().owner?.trim() ?? "";

  const { isLoading, data, revalidate, error } = useExec(GH, LIST_ARGS, {
    parseOutput: ({ stdout }) =>
      (JSON.parse(stdout || "[]") as Repo[])
        .filter(
          (r) =>
            !owner ||
            r.nameWithOwner.split("/")[0].toLowerCase() === owner.toLowerCase(),
        )
        .sort((a, b) => b.pushedAt.localeCompare(a.pushedAt)),
    failureToastOptions: {
      title: "Could not list repos",
      message: "Is the gh CLI installed and logged in?",
    },
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={
        owner ? `Search ${owner} repos…` : "Search repos you can release…"
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not reach GitHub"
          description="Install the gh CLI, then run: gh auth login"
          actions={<PreferencesAction />}
        />
      ) : null}
      {!error && !isLoading && data?.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No repos found"
          description={
            owner
              ? `You have no push access to any unarchived ${owner} repo. Clear the GitHub Owner preference to see every repo you can release.`
              : "Your gh login has no push access to any unarchived repo."
          }
          actions={<PreferencesAction />}
        />
      ) : null}
      {(data ?? []).map((repo) => (
        <List.Item
          key={repo.nameWithOwner}
          icon={{ source: Icon.Rocket, tintColor: Color.PrimaryText }}
          // ponytail: unfiltered, the list spans many owners — the bare name is ambiguous
          title={owner ? repo.nameWithOwner.split("/")[1] : repo.nameWithOwner}
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
