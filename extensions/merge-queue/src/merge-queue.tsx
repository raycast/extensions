import { Action, ActionPanel, Icon, Keyboard, LaunchProps, List, useNavigation } from "@raycast/api";
import { ReactElement, useEffect, useRef, useState } from "react";
import { ChecksList } from "./components/ChecksList";
import { EnterBranch, ErrorEmptyView } from "./components/ErrorView";
import { JobDetail } from "./components/JobDetail";
import { entryAccessories, entryIcon, entryStatusText } from "./components/presentation";
import { RepoPicker, SwitchRepository } from "./components/RepoPicker";
import { confirmRerunFailedForEntry } from "./components/rerun";
import { enableDemo, MergeQueueLaunchContext, useMergeQueue, useRepoChoices, useSelection } from "./data";
import { ordinal } from "./lib/format";
import { describeError } from "./lib/errors";
import { needsSignIn } from "./lib/gh";
import { failingRunIds, primaryFailingJob, QueueEntry, QueueSnapshot } from "./lib/queue";
import { RepoSelection, sameRepo, selectionKey, switchTargets } from "./lib/repos";

type Filter = "all" | "mine" | "attention";

const CHOOSE_REPOSITORY = "choose";

const POLL_MS = 30_000;
const SIGN_IN_POLL_MS = 5_000;

function needsAttention(entry: QueueEntry): boolean {
  return entry.health === "failing" || entry.health === "conflict";
}

function matchesFilter(entry: QueueEntry, filter: Filter): boolean {
  if (filter === "mine") {
    return entry.isMine;
  }
  if (filter === "attention") {
    return needsAttention(entry);
  }
  return true;
}

function sectionSubtitle(snapshot: QueueSnapshot, staleError?: Error): string {
  const attention = snapshot.entries.filter(needsAttention).length;
  const mine = snapshot.entries.find((entry) => entry.isMine);
  return [
    `${snapshot.entries.length} queued`,
    mine ? `you're ${ordinal(mine.position)}` : undefined,
    attention ? `${attention} need attention` : undefined,
    staleError ? `⚠ couldn't refresh: ${describeError(staleError).title}` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
}

function emptyTitle(filter: Filter): string {
  switch (filter) {
    case "mine":
      return "None of your pull requests are queued";
    case "attention":
      return "Nothing in the queue needs attention";
    default:
      return "The merge queue is empty";
  }
}

function isSnapshotOf(snapshot: QueueSnapshot | undefined, selection: RepoSelection | undefined) {
  return Boolean(
    snapshot && selection && snapshot.repo.toLowerCase() === `${selection.owner}/${selection.name}`.toLowerCase(),
  );
}

function EntryItem(props: {
  entry: QueueEntry;
  snapshot: QueueSnapshot;
  revalidate: () => void;
  switchAction: ReactElement;
}) {
  const { entry, snapshot, revalidate, switchAction } = props;
  const failingJob = primaryFailingJob(entry);
  const canRerun = failingRunIds(entry).length > 0;

  return (
    <List.Item
      id={String(entry.pr.number)}
      icon={{ value: entryIcon(entry), tooltip: entryStatusText(entry) }}
      title={entry.pr.title}
      subtitle={`#${entry.pr.number}`}
      keywords={[String(entry.pr.number), entry.pr.author, entry.pr.branch]}
      accessories={entryAccessories(entry)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push title="Show Checks" icon={Icon.List} target={<ChecksList initialEntry={entry} />} />
            <Action.OpenInBrowser title="Open Pull Request" url={entry.pr.url} />
            {failingJob?.jobId !== undefined ? (
              <Action.Push
                title={`Show ${failingJob.name} Failure`}
                icon={Icon.XMarkCircle}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                target={
                  <JobDetail
                    check={{ ...failingJob, jobId: failingJob.jobId }}
                    pr={entry.pr}
                    repo={snapshot.repo}
                    sha={entry.headSha}
                  />
                }
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {canRerun ? (
              <Action
                title="Rerun Failed Jobs"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                onAction={() => confirmRerunFailedForEntry(entry, revalidate)}
              />
            ) : null}
            <Action.CopyToClipboard
              title="Copy Pull Request URL"
              content={entry.pr.url}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard
              title="Copy Branch Name"
              content={entry.pr.branch}
              shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
            <Action.OpenInBrowser
              title="Open Merge Queue on GitHub"
              url={snapshot.url}
              shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
            />
            {switchAction}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Command(props: LaunchProps<{ launchContext: MergeQueueLaunchContext }>) {
  enableDemo(props.launchContext?.demo, props.launchContext?.demoError);
  const context = props.launchContext;
  const { selection, recents, setSelection, isLoading: selectionLoading } = useSelection();
  const cachedChoices = useRepoChoices({ execute: false });
  const { push } = useNavigation();
  const [dropdownKey, setDropdownKey] = useState(0);
  const queue = useMergeQueue(selection);
  const { error, isLoading, revalidate } = queue;
  const data = isSnapshotOf(queue.data, selection) ? queue.data : undefined;
  const [filter, setFilter] = useState<Filter>("all");
  const repoKey = selection ? selectionKey(selection) : "";
  const initialSelection = useRef<{ repo: string; id?: string }>(undefined);
  if (data && initialSelection.current?.repo !== repoKey) {
    const target = context?.prNumber ?? data.entries.find((entry) => entry.isMine)?.pr.number;
    initialSelection.current = { repo: repoKey, id: target === undefined ? undefined : String(target) };
  }
  const selectedId = initialSelection.current?.repo === repoKey ? initialSelection.current.id : undefined;
  const [choosing, setChoosing] = useState(context?.view === "repositories");

  const waitingForSignIn = needsSignIn(error);
  useEffect(() => {
    const timer = setInterval(revalidate, waitingForSignIn ? SIGN_IN_POLL_MS : POLL_MS);
    return () => clearInterval(timer);
  }, [revalidate, waitingForSignIn]);

  if (selectionLoading) {
    return <List isLoading />;
  }
  if (!selection || choosing) {
    return (
      <RepoPicker
        autoPick={!selection}
        current={selection}
        onPick={(picked) => {
          setSelection(picked);
          setChoosing(false);
        }}
      />
    );
  }

  const switchAction = (
    <Action.Push
      title="Switch Repository"
      icon={Icon.Switch}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      target={<SwitchRepository current={selection} onPick={setSelection} />}
    />
  );

  const launchedEntry =
    context?.view === "checks" || context?.view === "job"
      ? data?.entries.find((entry) => entry.pr.number === context.prNumber)
      : undefined;
  const launchedJob =
    context?.view === "job" ? launchedEntry?.checks.find((check) => check.name === context.check) : undefined;
  if (launchedEntry && launchedJob?.jobId !== undefined) {
    return (
      <JobDetail
        check={{ ...launchedJob, jobId: launchedJob.jobId }}
        pr={launchedEntry.pr}
        repo={data?.repo}
        sha={launchedEntry.headSha}
      />
    );
  }
  if (launchedEntry) {
    return <ChecksList initialEntry={launchedEntry} initialCheck={context?.check} />;
  }

  const entries = (data?.entries ?? []).filter((entry) => matchesFilter(entry, filter));
  const repoTargets = switchTargets(selection, recents, cachedChoices.data ?? []);
  const chooseAnother = (
    <Action.Push
      title="Choose Another Repository"
      icon={Icon.Switch}
      target={<SwitchRepository current={selection} onPick={setSelection} />}
    />
  );
  const enterBranch = (
    <Action.Push
      title="Enter Queue Branch…"
      icon={Icon.Code}
      target={<EnterBranch selection={selection} onPick={setSelection} />}
    />
  );

  return (
    <List
      isLoading={isLoading || (!data && !error)}
      searchBarPlaceholder="Filter by title, number, author, or branch"
      selectedItemId={selectedId}
      searchBarAccessory={
        <List.Dropdown
          key={dropdownKey}
          tooltip="Show or Switch Repository"
          value={`filter:${filter}`}
          onChange={(value) => {
            if (value.startsWith("filter:")) {
              setFilter(value.slice("filter:".length) as Filter);
              return;
            }
            setDropdownKey((key) => key + 1);
            if (value === CHOOSE_REPOSITORY) {
              push(<SwitchRepository current={selection} onPick={setSelection} />);
              return;
            }
            const target = repoTargets.find((candidate) => `repo:${selectionKey(candidate)}` === value);
            if (target && !sameRepo(target, selection)) {
              setFilter("all");
              setSelection(target);
            }
          }}
        >
          <List.Dropdown.Section title="Show">
            <List.Dropdown.Item title="Whole Queue" value="filter:all" icon={Icon.List} />
            <List.Dropdown.Item title="Mine" value="filter:mine" icon={Icon.Person} />
            <List.Dropdown.Item title="Needs Attention" value="filter:attention" icon={Icon.XMarkCircle} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Repository">
            {repoTargets.map((target) => (
              <List.Dropdown.Item
                key={selectionKey(target)}
                title={`${target.owner}/${target.name}${target.branch ? ` · ${target.branch}` : ""}`}
                value={`repo:${selectionKey(target)}`}
                icon={sameRepo(target, selection) ? Icon.CheckCircle : Icon.Circle}
              />
            ))}
            <List.Dropdown.Item
              title="Choose Another Repository…"
              value={CHOOSE_REPOSITORY}
              icon={Icon.MagnifyingGlass}
            />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {error && !data ? (
        <ErrorEmptyView error={error} onRetry={revalidate} switchAction={chooseAnother} branchAction={enterBranch} />
      ) : null}
      {data && entries.length === 0 ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title={emptyTitle(filter)}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Merge Queue on GitHub" url={data.url} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
              {switchAction}
            </ActionPanel>
          }
        />
      ) : null}
      {data ? (
        <List.Section title={`${data.repo} · ${data.branch}`} subtitle={sectionSubtitle(data, error)}>
          {entries.map((entry) => (
            <EntryItem
              key={entry.id}
              entry={entry}
              snapshot={data}
              revalidate={revalidate}
              switchAction={switchAction}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
