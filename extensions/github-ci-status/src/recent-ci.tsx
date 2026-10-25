import {
  Action,
  ActionPanel,
  Color,
  Detail,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { getAccessToken, useLocalStorage, withAccessToken } from "@raycast/utils";
import { createHash } from "node:crypto";
import { parseLookback, Repository, runStatus, WorkflowRun } from "./lib/model";
import { ConfigureRepositories } from "./configure-repositories";
import { useRecentCI } from "./lib/use-recent-ci";
import { github } from "./lib/oauth";
import { useTrackedRuns } from "./lib/use-tracked-runs";

function PreferencesAction() {
  return <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />;
}

function Command() {
  const preferences = getPreferenceValues<{ lookback: string }>();
  const { token } = getAccessToken();
  const {
    value: repositories,
    setValue: setRepositories,
    isLoading,
  } = useLocalStorage<Repository[] | null>(
    `tracked-repositories:${createHash("sha256").update(token).digest("hex")}`,
    null,
  );
  let lookback: number;
  try {
    lookback = parseLookback(preferences.lookback);
  } catch (error) {
    return (
      <Detail
        markdown={`# Check your preferences\n\n${error instanceof Error ? error.message : "Invalid preferences."}`}
        actions={
          <ActionPanel>
            <PreferencesAction />
          </ActionPanel>
        }
      />
    );
  }
  if (isLoading) return <List isLoading />;
  return (
    <RecentCI
      token={token}
      lookback={lookback}
      period={preferences.lookback.trim()}
      repositories={repositories ?? null}
      setRepositories={setRepositories}
    />
  );
}

export default withAccessToken(github)(Command);

const icons = {
  success: { source: Icon.CheckCircle, tintColor: Color.Green },
  failure: { source: Icon.XMarkCircle, tintColor: Color.Red },
  running: { source: Icon.Clock, tintColor: Color.Yellow },
  neutral: { source: Icon.MinusCircle, tintColor: Color.SecondaryText },
};

function RecentCI({
  token,
  lookback,
  period,
  repositories,
  setRepositories,
}: {
  token: string;
  lookback: number;
  period: string;
  repositories: Repository[] | null;
  setRepositories: (repositories: Repository[] | null) => Promise<void>;
}) {
  const { snapshot, loading, cached, refresh } = useRecentCI(token, lookback, repositories);
  const { tracked, toggle, reload: reloadTracked } = useTrackedRuns(token);
  const trackedIds = new Set(tracked.map((watch) => watch.run.id));
  const progress = loading
    ? `Checking ${snapshot.checked}/${snapshot.total || "…"} repositories`
    : `${snapshot.checked}/${snapshot.total} repositories checked`;
  const summary = `${progress} · Last scan: ${snapshot.finishedAt ? new Date(snapshot.finishedAt).toLocaleTimeString() : "Never"}${cached ? " · Cached" : ""}`;
  const issues = snapshot.issues.map((issue) => `${issue.repository ?? "Scan"}: ${issue.message}`).join("\n\n");
  const details = `# Scan status\n\n${summary}\n\n\`\`\`text\n${issues.replaceAll("`", "'") || "No scan issues."}\n\`\`\``;

  function renderActions({ run, showIssues = false }: { run?: WorkflowRun; showIssues?: boolean } = {}) {
    return (
      <ActionPanel>
        {showIssues && <Action.Push title="View Scan Issues" target={<Detail markdown={details} />} />}
        {run && (
          <ActionPanel.Submenu
            title="Workflow Options"
            icon={Icon.List}
            onOpen={() => void reloadTracked().catch(console.error)}
          >
            <Action.OpenInBrowser title="Open in Browser" url={run.html_url} />
            {(trackedIds.has(run.id) || run.status !== "completed") && (
              <Action
                title={trackedIds.has(run.id) ? "Untrack Notifications" : "Track Notifications"}
                icon={trackedIds.has(run.id) ? Icon.BellDisabled : Icon.Bell}
                onAction={() => toggle(run)}
              />
            )}
          </ActionPanel.Submenu>
        )}
        {!run && !showIssues && (
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => refresh(true)}
          />
        )}
        <Action.Push
          title="Configure Repositories"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          target={<ConfigureRepositories token={token} selection={repositories} onChange={setRepositories} />}
        />
        {(run || showIssues) && (
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => refresh(true)}
          />
        )}
        {run?.pull_requests?.[0] && (
          <Action.OpenInBrowser
            title="Open Pull Request"
            url={`${run.repository.html_url}/pull/${run.pull_requests[0].number}`}
          />
        )}
        {run && <Action.OpenInBrowser title="Open Repository" url={run.repository.html_url} />}
        {run && <Action.CopyToClipboard title="Copy Run URL" content={run.html_url} />}
        <Action.Push title="View Scan Status" icon={Icon.Info} target={<Detail markdown={details} />} />
        <PreferencesAction />
      </ActionPanel>
    );
  }

  return (
    <List
      isLoading={loading}
      navigationTitle={`Recent CI · Last ${period}`}
      searchBarPlaceholder="Search repositories, workflows, branches…"
    >
      {snapshot.issues.length > 0 && (
        <List.Section title="Scan issues">
          <List.Item
            id="scan-issues"
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
            title="Some results could not be refreshed"
            subtitle={`${snapshot.issues.length} scan issues · Cached results may be stale`}
            actions={renderActions({ showIssues: true })}
          />
        </List.Section>
      )}
      <List.Section title="Tracked runs outside current results">
        {tracked
          .filter(({ run }) => !snapshot.runs.some((item) => item.id === run.id))
          .map(({ run }) => (
            <List.Item
              key={run.id}
              id={String(run.id)}
              title={run.display_title || run.name || "Workflow run"}
              subtitle={run.repository.full_name}
              icon={icons[runStatus(run).kind]}
              keywords={[run.name ?? "", run.head_branch ?? "", run.head_sha]}
              accessories={[
                { icon: Icon.Bell, tooltip: "Notifications enabled for this run" },
                { text: run.head_branch ?? run.head_sha.slice(0, 7) },
                { text: runStatus(run).label, tooltip: "Last observed status from the background monitor" },
              ]}
              actions={renderActions({ run })}
            />
          ))}
      </List.Section>
      <List.Section title={`Workflow runs · Last ${period}`} subtitle={summary}>
        {snapshot.runs.map((run) => {
          const status = runStatus(run);
          const stale =
            cached ||
            snapshot.issues.some((issue) => !issue.repository || issue.repository === run.repository.full_name) ||
            (!loading && snapshot.checked < snapshot.total);
          return (
            <List.Item
              key={run.id}
              id={String(run.id)}
              icon={icons[status.kind]}
              title={run.display_title || run.name || "Workflow run"}
              subtitle={run.repository.full_name}
              keywords={[run.name ?? "", run.head_branch ?? "", run.head_sha, status.label]}
              accessories={[
                ...(trackedIds.has(run.id) ? [{ icon: Icon.Bell, tooltip: "Notifications enabled for this run" }] : []),
                ...(stale
                  ? [
                      {
                        icon: { source: Icon.ExclamationMark, tintColor: Color.Orange },
                        tooltip: "Cached result; this run may be stale.",
                      },
                    ]
                  : []),
                {
                  text: run.head_branch ?? run.head_sha.slice(0, 7),
                  tooltip: `${run.head_sha} · Attempt ${run.run_attempt}`,
                },
                { tag: { value: status.label, color: icons[status.kind].tintColor }, tooltip: run.name ?? "Workflow" },
                { date: new Date(run.created_at), tooltip: `Created ${new Date(run.created_at).toLocaleString()}` },
              ]}
              actions={renderActions({ run })}
            />
          );
        })}
      </List.Section>
      <List.EmptyView
        icon={loading ? Icon.Clock : Icon.CheckList}
        title={
          repositories?.length === 0
            ? "No repositories selected"
            : loading
              ? "Looking for recent CI runs…"
              : "No recent workflow runs"
        }
        description={
          repositories?.length === 0
            ? "Use Configure Repositories (⌘⇧R) to choose repositories to track."
            : loading
              ? progress
              : `No GitHub Actions runs were created in the last ${period}. ${summary}`
        }
        actions={renderActions()}
      />
    </List>
  );
}
