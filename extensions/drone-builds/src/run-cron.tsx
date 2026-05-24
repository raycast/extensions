import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showHUD,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { DroneCron, DroneRepo, listCrons, listRepos, runCron } from "./drone";

const REPOS_PAGE_SIZE = 25;
const MAX_REPO_PAGES = 20;

async function fetchAllRepos(): Promise<DroneRepo[]> {
  const all: DroneRepo[] = [];
  for (let page = 1; page <= MAX_REPO_PAGES; page++) {
    const batch = await listRepos(page);
    if (!batch || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < REPOS_PAGE_SIZE) break;
  }
  return all;
}

function fmtTs(unix: number | undefined): string {
  if (!unix) return "never";
  const sec = Math.max(0, Math.floor(Date.now() / 1000) - unix);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(unix * 1000).toLocaleDateString();
}

export default function Command() {
  const { data, isLoading } = useCachedPromise(fetchAllRepos, [], {
    onError: (e) => {
      showFailureToast(e, { title: "Failed to load repos" });
    },
  });
  const { push } = useNavigation();
  const repos = (data ?? []).filter((r) => r.active !== false);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Find a repo…">
      <List.Section title={`Repos (${repos.length})`}>
        {repos.map((repo) => (
          <List.Item
            key={repo.slug}
            icon={Icon.Hashtag}
            title={repo.slug}
            subtitle={repo.default_branch ?? ""}
            keywords={[repo.namespace, repo.name, repo.slug]}
            actions={
              <ActionPanel>
                <Action
                  title="Show Cron Jobs"
                  icon={Icon.Clock}
                  onAction={() => push(<CronsList repo={repo} />)}
                />
                {repo.link ? <Action.OpenInBrowser url={repo.link} /> : null}
                <Action.CopyToClipboard
                  title="Copy Slug"
                  content={repo.slug}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {!isLoading && repos.length === 0 && (
        <List.EmptyView
          title="No active repos found"
          description="The bearer token has no access to any active Drone repos."
          icon={Icon.MagnifyingGlass}
        />
      )}
    </List>
  );
}

function CronsList({ repo }: { repo: DroneRepo }) {
  const { data, isLoading, revalidate } = useCachedPromise(
    () => listCrons(repo.slug),
    [],
    {
      onError: (e) => {
        showFailureToast(e, { title: `Failed to load crons for ${repo.slug}` });
      },
    },
  );
  const crons: DroneCron[] = data ?? [];

  return (
    <List
      isLoading={isLoading}
      navigationTitle={repo.slug}
      searchBarPlaceholder="Find a cron job…"
    >
      {crons.map((c) => {
        const accessories: List.Item.Accessory[] = [];
        if (c.target || c.branch)
          accessories.push({ text: c.target || c.branch || "" });
        accessories.push(
          c.disabled ? { text: "disabled" } : { text: `last ${fmtTs(c.prev)}` },
        );

        return (
          <List.Item
            key={c.id}
            icon={
              c.disabled
                ? { source: Icon.MinusCircle, tintColor: Color.SecondaryText }
                : { source: Icon.Clock, tintColor: Color.Yellow }
            }
            title={c.name}
            subtitle={c.expr || ""}
            keywords={[c.name, c.expr || "", c.target || "", c.branch || ""]}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action
                  title={`Trigger “${c.name}” Now`}
                  icon={Icon.Play}
                  onAction={async () => {
                    try {
                      const build = await runCron(repo.slug, c.name);
                      await showHUD(
                        `▶ Triggered ${repo.slug} · ${c.name} → build #${build.number}`,
                      );
                      revalidate();
                    } catch (e) {
                      await showFailureToast(e as Error, {
                        title: `Failed to trigger ${c.name}`,
                      });
                    }
                  }}
                />
                {repo.link ? (
                  <Action.OpenInBrowser
                    title="Open Cron Settings in Browser"
                    url={`${repo.link}/settings/cron`}
                  />
                ) : null}
                <Action.CopyToClipboard
                  title="Copy Cron Name"
                  content={c.name}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action
                  title="Reload"
                  icon={Icon.RotateClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        );
      })}
      {!isLoading && crons.length === 0 && (
        <List.EmptyView
          title="No crons configured"
          description={`${repo.slug} has no cron jobs.`}
          icon={Icon.Clock}
        />
      )}
    </List>
  );
}
