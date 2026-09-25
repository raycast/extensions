import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { Requirements } from "./components/Requirements";
import { useRequirements } from "./hooks/useRequirements";
import {
  configuredRepositories,
  enrichWorkflowRuns,
  runStatus,
  runSubtitle,
  SourceFailure,
  WorkflowRun,
  WorkflowRunPager,
} from "./lib/github";
import { errorMessage, getStatus, githubAvatar, GitHubCliError, Pool } from "./lib/runpool";
import { WorkflowRunDetail } from "./workflow-run-detail";

type HistoryState = {
  runs: WorkflowRun[];
  pools: Pool[];
  failures: SourceFailure[];
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error?: unknown;
};

const INITIAL_STATE: HistoryState = {
  runs: [],
  pools: [],
  failures: [],
  hasMore: false,
  loading: true,
  loadingMore: false,
};

function statusColor(run: WorkflowRun): Color {
  switch (runStatus(run)) {
    case "success":
      return Color.Green;
    case "failure":
    case "timed out":
    case "startup failure":
      return Color.Red;
    case "cancelled":
    case "skipped":
      return Color.SecondaryText;
    default:
      return Color.Orange;
  }
}

function runnerText(run: WorkflowRun): string | undefined {
  if (run.locations) {
    if (run.locations.length === 1) return run.locations[0];
    if (run.locations.length > 1) return `${run.locations[0]} +${run.locations.length - 1}`;
    // Jobs exist and none of them ran on a runner. That is only worth saying
    // while a run is still waiting for one, which is the failure this view
    // exists to surface. A run that finished without a runner was skipped or
    // cancelled, and its conclusion already says so: "Runner not assigned"
    // beside the word "skipped" reads as a capacity problem that is not there.
    // It is also the longest thing on the row, and pushed the conclusion off
    // the end of it.
    return run.status === "completed" ? undefined : "Runner not assigned";
  }
  return run.status === "queued" ? "Runner not assigned" : undefined;
}

function timeAgo(timestamp: string, now = Date.now()): string | undefined {
  const elapsed = Math.max(0, Math.floor((now - Date.parse(timestamp)) / 1000));
  if (Number.isNaN(elapsed)) return undefined;
  if (elapsed < 60) return "just now";
  const minutes = Math.floor(elapsed / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Replace a visible raw row once its job and pull-request metadata arrives. */
function replaceRuns(current: WorkflowRun[], enriched: WorkflowRun[]): WorkflowRun[] {
  const byKey = new Map(enriched.map((run) => [run.key, run]));
  return current.map((run) => byKey.get(run.key) ?? run);
}

export default function Command() {
  // Every row here comes from `gh api`, so a broken gh leaves nothing to show.
  const { missing, recheck } = useRequirements({ needsGh: true });
  const pager = useRef<WorkflowRunPager | undefined>(undefined);
  const abort = useRef<AbortController | undefined>(undefined);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<HistoryState>(INITIAL_STATE);

  const enrich = useCallback(async (runs: WorkflowRun[], pools: Pool[], signal: AbortSignal) => {
    const enriched = await enrichWorkflowRuns(runs, pools, signal);
    if (signal.aborted) return;
    setState((current) => ({ ...current, runs: replaceRuns(current.runs, enriched) }));
  }, []);

  const loadMore = useCallback(async () => {
    const currentPager = pager.current;
    const controller = abort.current;
    if (!currentPager || !controller || controller.signal.aborted) return;
    setState((current) => ({ ...current, loadingMore: true }));

    try {
      const next = await currentPager.next(controller.signal);
      if (controller.signal.aborted) return;
      setState((current) => ({
        ...current,
        runs: [...current.runs, ...next.runs],
        failures: next.failures,
        hasMore: next.hasMore,
        loadingMore: false,
      }));
      void enrich(next.runs, state.pools, controller.signal);
    } catch (error) {
      if (controller.signal.aborted) return;
      setState((current) => ({ ...current, loadingMore: false }));
      await showFailureToast(error, { title: "Could Not Load More Runs" });
    }
  }, [enrich, state.pools]);

  // `recheck` as well as a re-render: the runpool version is probed once and
  // cached, so without forgetting it this screen keeps reporting the CLI as
  // outdated after it has been upgraded, which is the moment the button exists
  // for. Bumping the revision alone re-runs the fetch and not the lookup.
  const retry = useCallback(() => {
    recheck();
    setRevision((current) => current + 1);
  }, [recheck]);

  useEffect(() => {
    if (missing) return;

    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setState(INITIAL_STATE);

    async function initialise() {
      try {
        const status = await getStatus({ local: true, signal: controller.signal });
        const repositories = configuredRepositories(status);
        if (repositories.length === 0) {
          setState({ ...INITIAL_STATE, pools: status.pools, loading: false });
          return;
        }

        const nextPager = new WorkflowRunPager(repositories);
        pager.current = nextPager;
        const next = await nextPager.next(controller.signal);
        if (controller.signal.aborted) return;
        if (next.runs.length === 0 && next.failures.length === repositories.length) {
          // Every source failed for the same reason when that reason is the
          // GitHub CLI itself. Rethrow it rather than flattening it into a
          // string, so the view can answer it with a screen.
          const cli = next.failures.find((failure) => failure.error instanceof GitHubCliError)?.error;
          if (cli) throw cli;
          throw new Error(next.failures.map((failure) => failure.message).join("\n"));
        }
        setState({
          runs: next.runs,
          pools: status.pools,
          failures: next.failures,
          hasMore: next.hasMore,
          loading: false,
          loadingMore: false,
        });
        void enrich(next.runs, status.pools, controller.signal);
      } catch (error) {
        if (!controller.signal.aborted) setState({ ...INITIAL_STATE, loading: false, error });
      }
    }

    void initialise();
    return () => controller.abort();
  }, [enrich, missing, revision]);

  if (missing) return <Requirements missing={missing} onRecheck={retry} />;
  if (state.error instanceof GitHubCliError) {
    return <Requirements missing={state.error.reason === "missing" ? "gh" : "gh-auth"} onRecheck={retry} />;
  }

  const warning = state.failures.length
    ? `Could not read ${state.failures.map((failure) => failure.repository).join(", ")}`
    : undefined;

  return (
    <List
      isLoading={state.loading || state.loadingMore}
      navigationTitle="Recent Workflow Runs"
      searchBarPlaceholder="Filter workflow runs"
      pagination={{ pageSize: 25, hasMore: state.hasMore, onLoadMore: loadMore }}
    >
      {warning && (
        <List.Section title="Some repositories could not be read">
          <List.Item icon={Icon.Warning} title={warning} />
        </List.Section>
      )}
      {state.runs.map((run) => {
        const pullRequest = run.pullRequests?.[0];
        const runner = runnerText(run);
        const ago = timeAgo(run.createdAt);
        const [owner, repository] = run.repository.split("/");
        return (
          <List.Item
            key={run.key}
            icon={{ source: githubAvatar(owner), fallback: Icon.TwoPeople, mask: Image.Mask.RoundedRectangle }}
            title={`${repository ?? run.repository} / ${run.workflow}`}
            subtitle={runSubtitle(run)}
            accessories={[
              ...(runner ? [{ text: runner }] : []),
              ...(ago ? [{ text: ago }] : []),
              { tag: { value: runStatus(run), color: statusColor(run) } },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Jobs"
                  icon={Icon.List}
                  target={<WorkflowRunDetail run={run} pools={state.pools} />}
                />
                <Action.OpenInBrowser title="Open Run on GitHub" icon={Icon.ArrowNe} url={run.url} />
                {pullRequest && (
                  <Action.OpenInBrowser
                    title="Open Pull Request"
                    icon={Icon.TwoPeople}
                    url={pullRequest.html_url}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  />
                )}
                <Action.OpenInBrowser
                  title="Open Repository"
                  icon={Icon.Book}
                  url={`https://github.com/${run.repository}`}
                />
                <Action.CopyToClipboard title="Copy Run URL" content={run.url} />
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={retry} />
              </ActionPanel>
            }
          />
        );
      })}

      {!state.loading && state.error !== undefined && (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could Not Read Recent Runs"
          description={errorMessage(state.error)}
        />
      )}
      {!state.loading && !state.error && state.runs.length === 0 && (
        <List.EmptyView
          icon={Icon.Clock}
          title={state.pools.length === 0 ? "No Runner Pools Yet" : "No Workflow Runs Yet"}
          description={
            state.pools.length === 0
              ? "Create a runner pool before asking RunPool which repositories to read."
              : "The configured repositories have no workflow runs to show."
          }
        />
      )}
    </List>
  );
}
