import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { useMergeQueue, useSelection } from "../data";
import { truncate } from "../lib/format";
import { Check, QueueEntry } from "../lib/queue";
import { buildCopyText, buildPreviewMarkdown } from "../lib/report";
import { ListMetadata, metadataRows, useJobReport } from "./failure";
import { JobDetail } from "./JobDetail";
import { checkIcon, checkLabel, HEALTH_STYLE } from "./presentation";
import { confirmRerunFailedInRun, confirmRerunJob } from "./rerun";

const POLL_MS = 30_000;

type ViewActions = { revalidate: () => void };

function ViewSection(props: { entry: QueueEntry; view: ViewActions }) {
  const { entry, view } = props;
  return (
    <ActionPanel.Section>
      <Action.OpenInBrowser
        title="Open Pull Request"
        url={entry.pr.url}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={view.revalidate}
      />
    </ActionPanel.Section>
  );
}

function CheckItem(props: {
  check: Check;
  entry: QueueEntry;
  repo: string;
  view: ViewActions;
  id: string;
  selected: boolean;
}) {
  const { check, entry, repo } = props;
  const failing = check.state === "failure";
  const report = useJobReport({
    check,
    pr: entry.pr,
    repo,
    sha: entry.headSha,
    enabled: props.selected && (failing || check.state === "pending"),
    wantLog: props.selected && failing,
  });
  const { input, failureUrl } = report;
  const jobId = check.jobId;
  const view: ViewActions = {
    revalidate: () => {
      props.view.revalidate();
      report.revalidate();
    },
  };

  return (
    <List.Item
      id={props.id}
      icon={{ value: checkIcon(check), tooltip: `${checkLabel(check)}${check.required ? "" : " · optional"}` }}
      title={check.name}
      keywords={check.workflow ? [check.workflow] : undefined}
      detail={
        <List.Item.Detail
          isLoading={report.isLoading}
          markdown={buildPreviewMarkdown(input)}
          metadata={<ListMetadata rows={metadataRows(input, failureUrl, { compact: true })} />}
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {jobId !== undefined ? (
              <Action.Push
                title="Show Details"
                icon={Icon.Sidebar}
                target={<JobDetail check={{ ...check, jobId }} pr={entry.pr} repo={repo} sha={entry.headSha} />}
              />
            ) : null}
            {failureUrl ? (
              <Action.OpenInBrowser title={failing ? "Open Failure on GitHub" : "Open on GitHub"} url={failureUrl} />
            ) : null}
            {failing ? (
              <Action.CopyToClipboard
                title="Copy Failure Summary"
                content={buildCopyText(input)}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            ) : null}
            {input.log.status === "loaded" && input.log.summary.excerpt.length > 0 ? (
              <Action.CopyToClipboard
                title="Copy Log Excerpt"
                content={input.log.summary.excerpt.join("\n")}
                shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {jobId !== undefined ? (
              <Action
                title="Rerun This Job"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
                onAction={() => confirmRerunJob(check, view.revalidate)}
              />
            ) : null}
            {failing && check.runId !== undefined ? (
              <Action
                title="Rerun Failed Jobs in Run"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                onAction={() => confirmRerunFailedInRun(check, view.revalidate)}
              />
            ) : null}
          </ActionPanel.Section>
          <ViewSection entry={entry} view={view} />
        </ActionPanel>
      }
    />
  );
}

function checkKey(check: Check): string {
  return `${check.workflow ?? ""}/${check.name}/${check.jobId ?? ""}`;
}

export function ChecksList(props: { initialEntry: QueueEntry; initialCheck?: string }) {
  const { selection } = useSelection();
  const { data, isLoading, revalidate } = useMergeQueue(selection);
  const live = data?.entries.find((entry) => entry.pr.number === props.initialEntry.pr.number);
  const entry = live ?? props.initialEntry;
  const leftQueue = Boolean(data) && !live;
  const repo = data?.repo ?? (selection ? `${selection.owner}/${selection.name}` : "");
  const view: ViewActions = { revalidate };
  const initialCheck = entry.checks.find((check) => check.name === props.initialCheck);
  const initialSelection = initialCheck ? checkKey(initialCheck) : undefined;
  const [selectedId, setSelectedId] = useState(
    initialSelection ?? (entry.checks[0] ? checkKey(entry.checks[0]) : undefined),
  );

  useEffect(() => {
    const timer = setInterval(revalidate, POLL_MS);
    return () => clearInterval(timer);
  }, [revalidate]);

  const emptyDescription =
    entry.health === "conflict"
      ? "No checks ran. GitHub couldn't build a merge group for this PR, usually because of a merge conflict."
      : "Checks haven't started for this entry yet.";

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={entry.checks.length > 0}
      navigationTitle={`#${entry.pr.number} · ${truncate(entry.pr.title, 48)}${leftQueue ? " · left the queue" : ""}`}
      searchBarPlaceholder={`Filter ${entry.checks.length} checks`}
      selectedItemId={initialSelection}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
    >
      {entry.checks.length === 0 ? (
        <List.EmptyView
          icon={{ source: HEALTH_STYLE[entry.health].icon, tintColor: HEALTH_STYLE[entry.health].color }}
          title={HEALTH_STYLE[entry.health].label}
          description={emptyDescription}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Pull Request" url={entry.pr.url} />
            </ActionPanel>
          }
        />
      ) : null}
      {entry.checks.map((check) => (
        <CheckItem
          key={checkKey(check)}
          id={checkKey(check)}
          check={check}
          entry={entry}
          repo={repo}
          view={view}
          selected={checkKey(check) === selectedId}
        />
      ))}
    </List>
  );
}
