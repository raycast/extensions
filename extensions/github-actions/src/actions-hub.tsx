import { Action, ActionPanel, Color, Icon, List, Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { DispatchWorkflowForm } from "./components/dispatch-workflow-form";
import { RunDetail } from "./components/run-detail";
import { getErrorMessage } from "./lib/errors";
import { formatDuration, formatRelativeDateTime } from "./lib/format";
import { getGitHubToken } from "./lib/preferences";
import {
  getRecentRepositories,
  getRecentWorkflowTargets,
  recordRecentRepository,
  recordRecentWorkflowTarget,
} from "./lib/storage";
import { GitHubClient } from "./services/github-client";
import type { GitHubWorkflowRun } from "./types/github";

function getStatusIcon(run: GitHubWorkflowRun): { source: Icon; tintColor?: Color } {
  if (run.status === "in_progress" || run.status === "queued") {
    return { source: Icon.Clock, tintColor: Color.Orange };
  }

  if (run.conclusion === "success") {
    return { source: Icon.CheckCircle, tintColor: Color.Green };
  }

  if (run.conclusion === "failure" || run.conclusion === "cancelled") {
    return { source: Icon.XmarkCircle, tintColor: Color.Red };
  }

  return { source: Icon.Dot, tintColor: Color.SecondaryText };
}

function canRerunWorkflow(run: GitHubWorkflowRun): boolean {
  return run.status === "completed";
}

function canRerunFailedJobs(run: GitHubWorkflowRun): boolean {
  return run.status === "completed" && run.conclusion === "failure";
}

function canCancelRun(run: GitHubWorkflowRun): boolean {
  return run.status === "in_progress" || run.status === "queued";
}

export default function ActionsHubCommand() {
  const token = getGitHubToken();
  const client = useMemo(() => (token ? new GitHubClient(token) : null), [token]);
  const [selectedRepository, setSelectedRepository] = useState("");

  const {
    data: repositories = [],
    isLoading: repositoriesLoading,
    revalidate: revalidateRepositories,
  } = useCachedPromise(
    async () => {
      if (!client) {
        return [];
      }
      return client.listRepositories();
    },
    [],
    {
      initialData: [],
      onError: (error) => {
        console.error(getErrorMessage(error));
      },
    },
  );

  const { data: recentRepositories = [], revalidate: revalidateRecentRepositories } = useCachedPromise(
    getRecentRepositories,
    [],
    {
      initialData: [],
    },
  );
  const { data: recentWorkflowTargets = [], revalidate: revalidateRecentTargets } = useCachedPromise(
    getRecentWorkflowTargets,
    [],
    { initialData: [] },
  );

  useEffect(() => {
    if (selectedRepository) {
      return;
    }

    if (recentRepositories.length > 0) {
      setSelectedRepository(recentRepositories[0]);
      return;
    }

    if (repositories.length > 0) {
      setSelectedRepository(repositories[0].fullName);
    }
  }, [recentRepositories, repositories, selectedRepository]);

  useEffect(() => {
    if (!selectedRepository) {
      return;
    }

    void recordRecentRepository(selectedRepository).then(() => revalidateRecentRepositories());
  }, [revalidateRecentRepositories, selectedRepository]);

  const {
    data: runs = [],
    isLoading: runsLoading,
    revalidate: revalidateRuns,
  } = useCachedPromise(
    async (repo: string) => {
      if (!client || !repo) {
        return [];
      }

      return client.listWorkflowRuns(repo);
    },
    [selectedRepository],
    {
      execute: Boolean(client && selectedRepository),
      initialData: [],
      onError: async (error) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load workflow runs",
          message: getErrorMessage(error),
        });
      },
    },
  );

  async function runMutation(
    title: string,
    action: () => Promise<void>,
    run: GitHubWorkflowRun,
    successMessage: string,
  ) {
    if (!client || !selectedRepository) {
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title });

    try {
      await action();
      await recordRecentWorkflowTarget({
        repoFullName: selectedRepository,
        workflowId: run.workflowId,
        workflowName: run.workflowName,
      });
      await Promise.all([revalidateRuns(), revalidateRecentTargets()]);
      toast.style = Toast.Style.Success;
      toast.title = successMessage;
      toast.message = run.workflowName;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "GitHub action failed";
      toast.message = getErrorMessage(error);
    }
  }

  if (!token || !client) {
    return (
      <List
        searchBarPlaceholder="Configure your GitHub token in Raycast preferences"
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      >
        <List.EmptyView
          icon={Icon.Key}
          title="GitHub token required"
          description="Configure a Personal Access Token in extension preferences before using Actions Hub."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={repositoriesLoading || runsLoading}
      searchBarPlaceholder="Search runs by workflow, repo, branch, or actor"
      searchBarAccessory={
        <List.Dropdown tooltip="Repository" value={selectedRepository} onChange={setSelectedRepository}>
          {recentRepositories.length > 0 ? (
            <List.Dropdown.Section title="Recent Repositories">
              {recentRepositories.map((repo) => (
                <List.Dropdown.Item key={`recent-${repo}`} title={repo} value={repo} />
              ))}
            </List.Dropdown.Section>
          ) : null}
          <List.Dropdown.Section title="Repositories">
            {repositories.map((repository) => (
              <List.Dropdown.Item key={repository.id} title={repository.fullName} value={repository.fullName} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {recentRepositories.length > 0 || recentWorkflowTargets.length > 0 ? (
        <List.Section title="Recent Targets">
          {recentRepositories.map((repo) => (
            <List.Item
              key={`repo-${repo}`}
              icon={Icon.Folder}
              title={repo}
              subtitle="Recent repository"
              actions={
                <ActionPanel>
                  <Action title="Use Repository" icon={Icon.Check} onAction={() => setSelectedRepository(repo)} />
                  <Action.Push
                    title="Dispatch Workflow"
                    icon={Icon.Play}
                    target={<DispatchWorkflowForm initialRepository={repo} />}
                  />
                  <Action.OpenInBrowser url={`https://github.com/${repo}/actions`} />
                </ActionPanel>
              }
            />
          ))}
          {recentWorkflowTargets.map((target) => (
            <List.Item
              key={`workflow-${target.repoFullName}-${target.workflowId}`}
              icon={Icon.Bolt}
              title={target.workflowName}
              subtitle={target.repoFullName}
              actions={
                <ActionPanel>
                  <Action
                    title="Use Repository"
                    icon={Icon.Check}
                    onAction={() => setSelectedRepository(target.repoFullName)}
                  />
                  <Action.Push
                    title="Dispatch Workflow"
                    icon={Icon.Play}
                    target={<DispatchWorkflowForm initialRepository={target.repoFullName} />}
                  />
                  <Action.OpenInBrowser url={`https://github.com/${target.repoFullName}/actions`} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}

      <List.Section title="Quick Actions">
        <List.Item
          icon={Icon.Play}
          title="Dispatch Workflow"
          subtitle={selectedRepository || "Choose a repository first"}
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Dispatch Workflow"
                icon={Icon.Play}
                target={<DispatchWorkflowForm initialRepository={selectedRepository || undefined} />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.ArrowClockwise}
          title="Refresh"
          subtitle="Reload repositories, targets, and runs"
          actions={
            <ActionPanel>
              <Action
                title="Refresh Data"
                icon={Icon.ArrowClockwise}
                onAction={() => Promise.all([revalidateRepositories(), revalidateRecentTargets(), revalidateRuns()])}
              />
            </ActionPanel>
          }
        />
        {selectedRepository ? (
          <List.Item
            icon={Icon.Globe}
            title="Open Repository Actions Page"
            subtitle={selectedRepository}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://github.com/${selectedRepository}/actions`} />
              </ActionPanel>
            }
          />
        ) : null}
      </List.Section>

      <List.Section title={selectedRepository ? `Recent Runs · ${selectedRepository}` : "Recent Runs"}>
        {runs.map((run) => (
          <List.Item
            key={run.id}
            icon={getStatusIcon(run)}
            title={run.workflowName}
            subtitle={run.displayTitle || run.event}
            keywords={[
              selectedRepository,
              run.headBranch,
              run.event,
              run.actor?.login ?? "",
              run.conclusion ?? "",
              run.status,
            ]}
            accessories={[
              { tag: run.headBranch },
              { text: run.actor?.login ?? "unknown" },
              { text: `${run.status}${run.conclusion ? `/${run.conclusion}` : ""}` },
              {
                text: `${formatRelativeDateTime(run.runStartedAt ?? run.updatedAt)} · ${formatDuration(run.runStartedAt, run.updatedAt)}`,
              },
            ]}
            actions={
              <ActionPanel>
                {canRerunWorkflow(run) ? (
                  <Action
                    title="Rerun Workflow"
                    icon={Icon.ArrowClockwise}
                    onAction={() =>
                      runMutation(
                        "Triggering rerun...",
                        () => client.rerunWorkflow(selectedRepository, run.id),
                        run,
                        "Workflow rerun queued",
                      )
                    }
                  />
                ) : null}
                {canRerunFailedJobs(run) ? (
                  <Action
                    title="Rerun Failed Jobs"
                    icon={Icon.Bolt}
                    onAction={() =>
                      runMutation(
                        "Triggering failed jobs rerun...",
                        () => client.rerunFailedJobs(selectedRepository, run.id),
                        run,
                        "Failed jobs rerun queued",
                      )
                    }
                  />
                ) : null}
                {canCancelRun(run) ? (
                  <Action
                    title="Cancel Run"
                    icon={Icon.Stop}
                    style={Action.Style.Destructive}
                    onAction={() =>
                      runMutation(
                        "Canceling run...",
                        () => client.cancelRun(selectedRepository, run.id),
                        run,
                        "Run canceled",
                      )
                    }
                  />
                ) : null}
                <Action.Push
                  title="View Minimal Details"
                  icon={Icon.Sidebar}
                  target={<RunDetail client={client} repoFullName={selectedRepository} run={run} />}
                />
                <Action.OpenInBrowser url={run.htmlUrl} />
                <Action.CopyToClipboard title="Copy Run URL" content={run.htmlUrl} />
              </ActionPanel>
            }
          />
        ))}
        {!runs.length && !runsLoading ? (
          <List.EmptyView
            icon={Icon.Bolt}
            title="No workflow runs found"
            description={
              selectedRepository
                ? "Try another repository or refresh data."
                : "Choose a repository to load workflow runs."
            }
          />
        ) : null}
      </List.Section>
    </List>
  );
}
