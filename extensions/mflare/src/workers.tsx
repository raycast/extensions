import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect } from "react";
import BuildLog from "./build-log";
import {
  ConnectionActions,
  ConnectionForm,
  connectionProblem,
  ErrorView,
  NoAccountsView,
  QUIET,
  REAUTHORIZE_NOTE,
  useAccountSelection,
} from "./components";
import { Activity, BuildStatus, isRunning, listDeployments, listWorkers, openMFlare, Worker } from "./mflare";

// While a Build runs, the lists are read again this often. MFlare answers from what it already knows, so this asks
// Cloudflare for nothing.
const LIVE_REFRESH_MS = 10_000;

export default function Command() {
  const { accounts, accountId, isReady, hasNoAccounts, needsReauthorization, dropdown } = useAccountSelection();
  const workers = usePromise(listWorkers, [accountId], { execute: isReady, ...QUIET });
  useRefreshWhile(workers.data?.some((worker) => worker.has_build_in_progress) ?? false, workers.revalidate);

  // A Workers error counts only while there's an Account to read them for: without one, they aren't read.
  const error = accounts.error ?? (isReady ? workers.error : undefined);
  // Reads the Accounts again, and the Workers when there's an Account, e.g. once the connection changes. revalidate
  // reads even with `execute` off, so it's only called then; a new Account starts the read on its own.
  const reload = () => {
    accounts.revalidate();
    if (isReady) workers.revalidate();
  };

  // Without a connection MFlare takes, there's nothing to list: ask for one right away.
  const problem = connectionProblem(error);
  if (problem) return <ConnectionForm problem={problem} onConnected={reload} />;
  return (
    <List
      isLoading={accounts.isLoading || workers.isLoading}
      searchBarPlaceholder="Search Workers…"
      searchBarAccessory={dropdown}
    >
      {error ? (
        <ErrorView error={error} failedTitle="Couldn't load Workers" onRetry={reload} />
      ) : hasNoAccounts ? (
        <NoAccountsView onRetry={reload} />
      ) : workers.data?.length === 0 ? (
        <List.EmptyView icon={Icon.Code} title="No Workers" description="This Account has no Workers yet." />
      ) : (
        // A section only to say the list can't be refreshed until the User signs in again.
        <List.Section subtitle={needsReauthorization ? REAUTHORIZE_NOTE : undefined}>
          {workers.data?.map((worker) => (
            <WorkerRow key={worker.name} worker={worker} accountId={accountId} onRefresh={reload} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function WorkerRow({ worker, accountId, onRefresh }: { worker: Worker; accountId?: string; onRefresh: () => void }) {
  const accessories: List.Item.Accessory[] = [];
  if (worker.muted) accessories.push({ icon: Icon.BellDisabled, tooltip: "Muted in MFlare" });
  // Only a Build that needs a look gets a tag, so a glance down the list finds it: one that succeeded, or a
  // Deployment, shows just its date.
  if (worker.latest?.kind === "build" && worker.latest.status !== "succeeded") {
    accessories.push({ tag: activityTag(worker.latest) });
  }
  if (worker.last_activity_at) accessories.push({ date: new Date(worker.last_activity_at) });

  return (
    <List.Item
      icon={{ source: Icon.Code, tintColor: Color.SecondaryText }}
      title={worker.name}
      subtitle={worker.latest ? activitySummary(worker.latest) : undefined}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show History"
            icon={Icon.List}
            target={<WorkerHistory worker={worker} accountId={accountId} />}
          />
          <Action.OpenInBrowser title="Open in Cloudflare Dashboard" url={worker.dashboard_url} />
          <Action.CopyToClipboard title="Copy Worker Name" content={worker.name} />
          <Action
            title="Open in MFlare"
            icon={Icon.AppWindow}
            onAction={() => openMFlare(accountId ? { page: "deployments", accountId, worker: worker.name } : undefined)}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
          <ConnectionActions onChange={onRefresh} />
        </ActionPanel>
      }
    />
  );
}

// A Worker's latest Deployments and Builds, newest first, with the selected one's details beside the list.
function WorkerHistory({ worker, accountId }: { worker: Worker; accountId?: string }) {
  const history = usePromise(listDeployments, [worker.name, accountId], QUIET);
  useRefreshWhile(
    history.data?.some((activity) => activity.kind === "build" && isRunning(activity.status)) ?? false,
    history.revalidate,
  );

  return (
    <List
      isLoading={history.isLoading}
      isShowingDetail={!history.error && (history.data?.length ?? 0) > 0}
      navigationTitle={worker.name}
      searchBarPlaceholder="Filter Deployments and Builds…"
    >
      {history.error ? (
        <ErrorView error={history.error} failedTitle="Couldn't load the history" onRetry={history.revalidate} />
      ) : history.data?.length === 0 ? (
        <List.EmptyView icon={Icon.Clock} title="No Deployments or Builds yet" />
      ) : (
        history.data?.map((activity) => (
          <List.Item
            key={activity.id}
            icon={activityIcon(activity)}
            title={activityTitle(activity)}
            keywords={activityKeywords(activity)}
            accessories={[{ date: new Date(activity.created_on) }]}
            detail={<ActivityDetail activity={activity} />}
            actions={
              <ActionPanel>
                {activity.kind === "build" && (
                  <Action.Push
                    title="Show Build Log"
                    icon={Icon.Terminal}
                    target={<BuildLog worker={worker.name} build={activity} accountId={accountId} />}
                  />
                )}
                <Action.OpenInBrowser title="Open in Cloudflare Dashboard" url={worker.dashboard_url} />
                <Action
                  title="Open in MFlare"
                  icon={Icon.AppWindow}
                  onAction={() =>
                    openMFlare(
                      accountId ? { page: "deployments", accountId, worker: worker.name, activity } : undefined,
                    )
                  }
                />
                {activity.kind === "build" && activity.commit_hash && (
                  <Action.CopyToClipboard title="Copy Commit Hash" content={activity.commit_hash} />
                )}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={history.revalidate}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function ActivityDetail({ activity }: { activity: Activity }) {
  const Metadata = List.Item.Detail.Metadata;
  if (activity.kind === "deployment") {
    return (
      <List.Item.Detail
        markdown={activity.message ? escapeMarkdown(activity.message) : undefined}
        metadata={
          <Metadata>
            <Metadata.TagList title="Kind">
              <Metadata.TagList.Item text="Deployment" color={Color.Orange} />
            </Metadata.TagList>
            <Metadata.Label title="Source" text={activity.source} />
            {activity.author_email && <Metadata.Label title="Author" text={activity.author_email} />}
            <Metadata.Label title="Deployed" text={formatDate(activity.created_on)} />
          </Metadata>
        }
      />
    );
  }

  const tag = activityTag(activity);
  return (
    <List.Item.Detail
      markdown={activity.commit_message ? escapeMarkdown(activity.commit_message) : undefined}
      metadata={
        <Metadata>
          <Metadata.TagList title="Build">
            <Metadata.TagList.Item text={tag.value} color={tag.color} />
          </Metadata.TagList>
          {activity.branch && <Metadata.Label title="Branch" text={activity.branch} />}
          {activity.commit_hash && <Metadata.Label title="Commit" text={activity.commit_hash.slice(0, 7)} />}
          {activity.author && <Metadata.Label title="Author" text={activity.author} />}
          <Metadata.Label title="Started" text={formatDate(activity.started_on ?? activity.created_on)} />
          {activity.started_on && activity.stopped_on && (
            <Metadata.Label title="Took" text={formatDuration(activity.started_on, activity.stopped_on)} />
          )}
        </Metadata>
      }
    />
  );
}

// Reads the list again every few seconds while something is still running.
function useRefreshWhile(running: boolean, refresh: () => void) {
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(refresh, LIVE_REFRESH_MS);
    return () => clearInterval(timer);
  }, [running, refresh]);
}

const BUILD_TAGS: Record<BuildStatus, { value: string; color: Color }> = {
  queued: { value: "Queued", color: Color.SecondaryText },
  building: { value: "Building", color: Color.Blue },
  succeeded: { value: "Succeeded", color: Color.Green },
  failed: { value: "Failed", color: Color.Red },
  cancelled: { value: "Cancelled", color: Color.SecondaryText },
};

function activityTag(activity: Activity): { value: string; color: Color } {
  return activity.kind === "build" ? BUILD_TAGS[activity.status] : { value: "Deployed", color: Color.Green };
}

function activityIcon(activity: Activity): List.Item.Props["icon"] {
  if (activity.kind === "deployment") return { source: Icon.Rocket, tintColor: Color.Orange };
  return { source: Icon.Hammer, tintColor: BUILD_TAGS[activity.status].color };
}

function activityTitle(activity: Activity): string {
  if (activity.kind === "deployment") return firstLine(activity.message) ?? `Deployment via ${activity.source}`;
  return firstLine(activity.commit_message) ?? "Build";
}

// The Worker list's subtitle. A Deployment's author is left to its details, since an email makes the row long.
function activitySummary(activity: Activity): string {
  if (activity.kind === "deployment") return activity.source;
  return [activity.branch, firstLine(activity.commit_message)].filter(Boolean).join(" · ");
}

function activityKeywords(activity: Activity): string[] {
  if (activity.kind === "deployment") return [activity.source, activity.author_email ?? ""].filter(Boolean);
  return [activity.status, activity.branch ?? "", activity.author ?? "", activity.commit_hash ?? ""].filter(Boolean);
}

function firstLine(text: string | null): string | undefined {
  return text?.split("\n")[0].trim() || undefined;
}

// Commit messages are plain text: keep Markdown from reading `*`, `_` or a leading `#` or `-` as formatting, and keep
// their line breaks. Parentheses and brackets stay as they are, since Raycast reads `\(` and `\[` as LaTeX.
function escapeMarkdown(text: string): string {
  return text
    .replace(/([\\`*_~|])/g, "\\$1")
    .replace(/^(\s*)([#>+-])/gm, "$1\\$2")
    .replace(/^(\s*\d+)\./gm, "$1\\.")
    .replace(/\n/g, "  \n");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function formatDuration(start: string, end: string): string {
  const seconds = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000));
  return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}
