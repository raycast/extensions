import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";

import { getErrorMessage } from "../helpers/errors";
import { getGitHubClient } from "../helpers/withGithubClient";
import { WorkflowRunsResponse } from "../workflow-runs";

export type WorkflowRun = WorkflowRunsResponse["data"]["workflow_runs"][0];

type WorkflowRunActionsProps = {
  workflowRun: WorkflowRun;
  repository: string;
  mutateList: MutatePromise<WorkflowRunsResponse | undefined>;
};

export function WorkflowRunActions({ workflowRun, repository, mutateList }: WorkflowRunActionsProps) {
  const { octokit } = getGitHubClient();

  const [owner, repo] = repository.split("/");

  const commit = workflowRun.head_sha.slice(0, 7);
  const keywords: List.Item.Props["keywords"] = [workflowRun.head_sha];
  const accessories: List.Item.Accessory[] = [
    {
      text: commit,
      tooltip: `Author: ${workflowRun.head_commit?.author?.name ?? workflowRun.head_commit?.author?.email}`,
    },
  ];

  if (workflowRun.head_branch) {
    accessories.unshift({
      text: workflowRun.head_branch,
    });

    keywords.push(workflowRun.head_branch);
  }

  async function rerunWorkflow() {
    await showToast({ style: Toast.Style.Animated, title: "Sending re-run request" });

    try {
      await octokit.rest.actions.reRunWorkflow({ run_id: workflowRun.id, owner, repo });

      await mutateList();

      await showToast({
        style: Toast.Style.Success,
        title: "Sent re-run request",
        message: "Refresh in 5-10 seconds.",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed sending re-run request",
        message: getErrorMessage(error),
      });
    }
  }

  async function cancelRun() {
    await showToast({ style: Toast.Style.Animated, title: "Sending cancel request" });

    try {
      await octokit.rest.actions.cancelWorkflowRun({ run_id: workflowRun.id, owner, repo });

      await mutateList();

      await showToast({
        style: Toast.Style.Success,
        title: "Sent cancel request",
        message: "Refresh in 10-15 seconds.",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed sending cancel request",
        message: getErrorMessage(error),
      });
    }
  }

  async function deleteRun() {
    await showToast({ style: Toast.Style.Animated, title: "Deleting Run" });

    try {
      await octokit.rest.actions.deleteWorkflowRun({ run_id: workflowRun.id, owner, repo });

      await mutateList();

      await showToast({
        style: Toast.Style.Success,
        title: "Deleted run",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed deleting run",
        message: getErrorMessage(error),
      });
    }
  }

  return (
    <ActionPanel title={commit}>
      <Action.OpenInBrowser url={workflowRun.html_url} />

      <ActionPanel.Section>
        {workflowRun.status === "completed" ? (
          <Action
            title="Re-run Workflow"
            icon={Icon.Clock}
            onAction={rerunWorkflow}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
          />
        ) : null}

        {workflowRun.status === "queued" || workflowRun.status === "in_progress" ? (
          <Action
            title="Cancel Run"
            icon={Icon.XMarkCircle}
            onAction={cancelRun}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
          />
        ) : null}

        <Action
          icon={Icon.Trash}
          title="Delete Run"
          style={Action.Style.Destructive}
          onAction={deleteRun}
          shortcut={{ modifiers: ["cmd"], key: "delete" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          icon={Icon.ArrowClockwise}
          title="Refresh"
          onAction={mutateList}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
