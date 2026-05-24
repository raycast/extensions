import { useMemo } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  getPreferenceValues,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import {
  BuildStatus,
  DroneBuild,
  DroneFeed,
  getMe,
  listMyBuilds,
} from "./drone";
import { isMine, repoMatches } from "./filter";
import { doCancel, doRestart } from "./actions";
import { BuildDetailView } from "./build-detail";

type Item = { build: DroneBuild; slug: string };

function statusIcon(status: BuildStatus): { source: Icon; tintColor: Color } {
  switch (status) {
    case "success":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "failure":
    case "error":
    case "killed":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "declined":
    case "skipped":
      return { source: Icon.MinusCircle, tintColor: Color.SecondaryText };
    case "running":
      return { source: Icon.CircleProgress, tintColor: Color.Yellow };
    case "pending":
    case "waiting_on_dependencies":
    case "blocked":
      return { source: Icon.Clock, tintColor: Color.SecondaryText };
    default:
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
}

function fmtTime(unix: number): string {
  if (!unix) return "—";
  return new Date(unix * 1000).toLocaleString();
}

function fmtDur(start: number, end: number): string {
  if (!start) return "—";
  const finished = end || Math.floor(Date.now() / 1000);
  const sec = Math.max(0, finished - start);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
}

function isRunningStatus(s: BuildStatus): boolean {
  return (
    s === "running" ||
    s === "pending" ||
    s === "waiting_on_dependencies" ||
    s === "blocked"
  );
}

function isTerminalStatus(s: BuildStatus): boolean {
  return (
    s === "success" ||
    s === "failure" ||
    s === "error" ||
    s === "killed" ||
    s === "declined"
  );
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const { data, isLoading, revalidate } = useCachedPromise(
    async () => {
      const [me, feed] = await Promise.all([getMe(), listMyBuilds(1)]);
      return { me, feed };
    },
    [],
    {
      onError: (err) => {
        showFailureToast(err, { title: "Drone API error" });
      },
    },
  );

  const items: Item[] = useMemo(() => {
    if (!data) return [];
    const normalized: Item[] = data.feed
      .filter((f): f is DroneFeed & { build: DroneBuild } => f.build != null)
      .map((f) => ({ build: f.build, slug: f.slug }));
    return normalized
      .filter((it) => prefs.filterMode === "all" || isMine(it.build, data.me))
      .filter((it) => repoMatches(it.slug, prefs));
  }, [data, prefs.filterMode, prefs.includeRepos, prefs.excludeRepos]);

  const running = items.filter((it) => isRunningStatus(it.build.status));
  const recent = items.filter((it) => !isRunningStatus(it.build.status));

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Filter by repo, message, branch, author…"
    >
      {running.length > 0 && (
        <List.Section title={`Active (${running.length})`}>
          {running.map((it) => (
            <BuildItem
              key={`${it.slug}-${it.build.id}`}
              item={it}
              reload={revalidate}
            />
          ))}
        </List.Section>
      )}
      <List.Section title={`Recent (${recent.length})`}>
        {recent.map((it) => (
          <BuildItem
            key={`${it.slug}-${it.build.id}`}
            item={it}
            reload={revalidate}
          />
        ))}
      </List.Section>
      {items.length === 0 && !isLoading && (
        <List.EmptyView
          title="No builds"
          description="No builds matched the current filters."
          icon={Icon.MagnifyingGlass}
        />
      )}
    </List>
  );
}

function BuildItem({ item, reload }: { item: Item; reload: () => void }) {
  const b = item.build;
  const running = isRunningStatus(b.status);
  const terminal = isTerminalStatus(b.status);
  const { push } = useNavigation();

  const headline = `${b.status.toUpperCase()} · ${b.event}${b.target ? ` → ${b.target}` : ""}`;
  const markdown = [
    `# ${item.slug} #${b.number}`,
    "",
    `**${headline}**`,
    "",
    "---",
    "",
    "```",
    (b.message || "").trim() || "(no commit message)",
    "```",
  ].join("\n");

  return (
    <List.Item
      icon={statusIcon(b.status)}
      title={`${item.slug} #${b.number}`}
      subtitle={(b.message || "").split("\n")[0].slice(0, 80)}
      keywords={[
        item.slug,
        b.target || "",
        b.ref || "",
        b.author_login || "",
        b.sender || "",
      ]}
      accessories={[{ text: b.status }]}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Repo" text={item.slug} />
              <List.Item.Detail.Metadata.TagList title="Status">
                <List.Item.Detail.Metadata.TagList.Item
                  text={b.status}
                  color={statusIcon(b.status).tintColor}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label title="Event" text={b.event} />
              <List.Item.Detail.Metadata.Label
                title="Branch / Target"
                text={b.target || b.ref || "—"}
              />
              <List.Item.Detail.Metadata.Label
                title="Author"
                text={b.author_login || "—"}
              />
              <List.Item.Detail.Metadata.Label
                title="Sender"
                text={b.sender || "—"}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Started"
                text={fmtTime(b.started)}
              />
              <List.Item.Detail.Metadata.Label
                title="Finished"
                text={fmtTime(b.finished)}
              />
              <List.Item.Detail.Metadata.Label
                title="Duration"
                text={fmtDur(b.started, b.finished)}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Link
                title="Open in Browser"
                target={b.link}
                text={b.link}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title="View Stages & Logs"
            icon={Icon.AppWindowSidebarLeft}
            onAction={() =>
              push(
                <BuildDetailView
                  slug={item.slug}
                  number={b.number}
                  fallbackLink={b.link}
                />,
              )
            }
          />
          <Action.OpenInBrowser
            title="Open in Browser"
            url={b.link}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          {terminal && (
            <Action
              title="Restart Build"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={async () => {
                await doRestart(item.slug, b.number);
                reload();
              }}
            />
          )}
          {running && (
            <Action
              title="Cancel Build"
              icon={Icon.Xmark}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                await doCancel(item.slug, b.number);
                reload();
              }}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Build URL"
            content={b.link}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action
            title="Reload"
            icon={Icon.RotateClockwise}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={reload}
          />
        </ActionPanel>
      }
    />
  );
}
