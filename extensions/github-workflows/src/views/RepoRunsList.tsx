import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { Repo, getRemoteOwnerRepo } from "../lib/git";
import { listWorkflowRuns, WorkflowRun } from "../lib/github";
import { listWorkflowFiles, WorkflowFile } from "../lib/workflows";
import WorkflowFileActionPanelSection from "../components/WorkflowFileActionPanelSection";
import { useRunWorkflow } from "../hooks/useRunWorkflow";

/**
 * Resolves the workflow file behind a run (best-effort matches the run's path against the locally
 * checked-out `.github/workflows` files, to pick up its declared inputs) and whether it's currently
 * dispatchable. Since GitHub's REST API doesn't cheaply expose whether a given workflow still supports
 * `workflow_dispatch` without an extra API call per workflow, dispatchability is a heuristic: either the
 * local file match declares `workflow_dispatch`, or the run's own `event` was `"workflow_dispatch"`
 * (proving it was dispatchable when triggered) — even if the local checkout is on a different
 * branch/commit than the one the run originally used.
 */
function resolveWorkflowForRun(
  workflowFiles: WorkflowFile[],
  run: WorkflowRun,
): { workflow: WorkflowFile; isDispatchable: boolean } {
  const match = workflowFiles.find((wf) => run.path.endsWith(`/${wf.fileName}`) || run.path === wf.fileName);
  const isDispatchable = match?.hasWorkflowDispatch === true || run.event === "workflow_dispatch";

  if (match) return { workflow: match, isDispatchable };

  const fileName = run.path.split("/").pop() || run.path;
  return {
    workflow: { fileName, path: run.path, name: run.name, hasWorkflowDispatch: isDispatchable, inputs: [] },
    isDispatchable,
  };
}

interface RepoRunsListProps {
  repo: Repo;
}

const ALL_WORKFLOWS = "__all__";
const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;
/** Safety cap on how many raw GitHub API pages we'll scan for a single "load more" call. */
const MAX_RAW_PAGES_PER_LOAD = 10;

/** Whether a run matches the workflow dropdown filter and/or the search query (name, branch, triggering actor). */
function runMatches(run: WorkflowRun, query: string, workflow: string): boolean {
  if (workflow !== ALL_WORKFLOWS && !(run.path.endsWith(`/${workflow}`) || run.path === workflow)) {
    return false;
  }

  if (!query) return true;

  const actorLogin = run.actor?.login ?? run.triggering_actor?.login ?? "";
  return [run.name, run.display_title, run.head_branch, actorLogin].some((field) =>
    (field ?? "").toLowerCase().includes(query),
  );
}

export default function RepoRunsList({ repo }: RepoRunsListProps) {
  const { pop } = useNavigation();
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>(ALL_WORKFLOWS);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");

  const { data: workflowFiles = [] } = useCachedPromise(
    async (repoPath: string) => listWorkflowFiles(repoPath),
    [repo.path],
  );

  const { getRunWorkflowTarget } = useRunWorkflow(repo);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearchText(searchText.trim().toLowerCase()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchText]);

  const { data: ownerRepo, isLoading: isLoadingOwnerRepo } = useCachedPromise(
    async (repoPath: string) => getRemoteOwnerRepo(repoPath),
    [repo.path],
  );

  useEffect(() => {
    if (!isLoadingOwnerRepo && !ownerRepo) {
      void showToast({
        style: Toast.Style.Failure,
        title: "No GitHub remote found",
        message: `Could not determine owner/repo for ${repo.name}`,
      });
      pop();
    }
  }, [isLoadingOwnerRepo, ownerRepo]);

  // Tracks the next raw GitHub API page to fetch while scanning for matches, and whether
  // we've reached the end of all runs for the current filters. Reset whenever the repo,
  // search text, or workflow filter changes (see the effect below).
  const rawPageRef = useRef(1);
  const exhaustedRef = useRef(false);

  useEffect(() => {
    rawPageRef.current = 1;
    exhaustedRef.current = false;
  }, [ownerRepo, debouncedSearchText, selectedWorkflow]);

  const {
    data: runs,
    isLoading: isLoadingRuns,
    pagination,
    revalidate,
  } = useCachedPromise(
    (owner: typeof ownerRepo, query: string, workflow: string) => async (paginationOptions: { page: number }) => {
      if (!owner) return { data: [], hasMore: false };

      // No active filter: fall back to a simple one-API-page-per-logical-page fetch.
      if (!query && workflow === ALL_WORKFLOWS) {
        const { runs: pageRuns, totalCount } = await listWorkflowRuns(
          owner.host,
          owner.owner,
          owner.repo,
          paginationOptions.page + 1,
          PAGE_SIZE,
        );
        return { data: pageRuns, hasMore: (paginationOptions.page + 1) * PAGE_SIZE < totalCount };
      }

      // Searching/filtering: scan successive raw API pages, accumulating matches, so the
      // search covers every run ever recorded rather than just the runs already loaded.
      if (exhaustedRef.current) {
        return { data: [], hasMore: false };
      }

      const matches: WorkflowRun[] = [];
      let scannedPages = 0;
      let hasMoreRaw = true;

      while (matches.length < PAGE_SIZE && scannedPages < MAX_RAW_PAGES_PER_LOAD && hasMoreRaw) {
        const rawPage = rawPageRef.current;
        const { runs: pageRuns, totalCount } = await listWorkflowRuns(
          owner.host,
          owner.owner,
          owner.repo,
          rawPage,
          PAGE_SIZE,
        );
        matches.push(...pageRuns.filter((run) => runMatches(run, query, workflow)));
        rawPageRef.current += 1;
        scannedPages += 1;
        hasMoreRaw = rawPage * PAGE_SIZE < totalCount;
      }

      if (!hasMoreRaw) {
        exhaustedRef.current = true;
      }

      return { data: matches, hasMore: hasMoreRaw };
    },
    [ownerRepo, debouncedSearchText, selectedWorkflow],
  );

  const isLoading = isLoadingOwnerRepo || isLoadingRuns;

  const handleRefresh = () => {
    rawPageRef.current = 1;
    exhaustedRef.current = false;
    void revalidate();
  };

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search all runs by workflow, branch, or triggering user..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Workflow" value={selectedWorkflow} onChange={setSelectedWorkflow}>
          <List.Dropdown.Item title="All Workflows" value={ALL_WORKFLOWS} />
          {workflowFiles.map((wf) => (
            <List.Dropdown.Item key={wf.fileName} title={wf.name} value={wf.fileName} />
          ))}
        </List.Dropdown>
      }
    >
      {(runs ?? []).length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Workflow Runs Found"
          description={
            debouncedSearchText
              ? `No runs matching "${debouncedSearchText}" were found for ${repo.name}.`
              : `No runs found for ${repo.name}.`
          }
        />
      ) : (
        (runs ?? []).map((run) => {
          const { workflow: workflowForRun, isDispatchable } = resolveWorkflowForRun(workflowFiles, run);

          return (
            <List.Item
              key={run.id}
              icon={runStatusIcon(run)}
              title={run.display_title || run.head_commit?.message?.split("\n")[0] || `Run #${run.id}`}
              subtitle={run.name}
              accessories={[
                ...(isDispatchable ? [{ icon: Icon.Play, tooltip: "Can be run manually" }] : []),
                { text: run.head_branch },
                { date: new Date(run.created_at) },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title={run.display_title}>
                    <Action.OpenInBrowser url={run.html_url} />
                  </ActionPanel.Section>

                  <WorkflowFileActionPanelSection
                    repoPath={repo.path}
                    workflowFilePath={run.path}
                    ownerRepo={ownerRepo}
                    branch={run.head_branch}
                  >
                    {isDispatchable && (
                      <Action.Push
                        title="Run Workflow"
                        icon={Icon.Play}
                        shortcut={{
                          macOS: { modifiers: ["cmd", "shift"], key: "r" },
                          Windows: { modifiers: ["ctrl", "shift"], key: "r" },
                        }}
                        target={getRunWorkflowTarget(workflowForRun, run.head_branch)}
                      />
                    )}
                  </WorkflowFileActionPanelSection>
                  <ActionPanel.Section>
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={handleRefresh}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function runStatusIcon(run: WorkflowRun): { source: Icon; tintColor: Color } {
  if (run.status !== "completed") {
    return { source: Icon.CircleProgress, tintColor: Color.Yellow };
  }

  switch (run.conclusion) {
    case "success":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "failure":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "cancelled":
      return { source: Icon.MinusCircle, tintColor: Color.SecondaryText };
    case "skipped":
      return { source: Icon.CircleDisabled, tintColor: Color.SecondaryText };
    default:
      return { source: Icon.QuestionMarkCircle, tintColor: Color.SecondaryText };
  }
}
