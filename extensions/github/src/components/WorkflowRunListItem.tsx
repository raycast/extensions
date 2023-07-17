import { List } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";

import { getWorkflowStatus } from "../helpers/workflow";
import { WorkflowRunsResponse } from "../workflow-runs";

import { WorkflowRunActions } from "./WorkflowRunActions";

export type WorkflowRun = WorkflowRunsResponse["data"]["workflow_runs"][0];

type WorkflowRunListItemProps = {
  workflowRun: WorkflowRun;
  repository: string;
  mutateList: MutatePromise<WorkflowRunsResponse | undefined>;
};

export function WorkflowRunListItem({ workflowRun, repository, mutateList }: WorkflowRunListItemProps) {
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
      tag: workflowRun.head_branch,
    });

    keywords.push(workflowRun.head_branch);
  }

  return (
    <List.Item
      icon={getWorkflowStatus(workflowRun)}
      title={`${workflowRun.name}: ${workflowRun.head_commit?.message}`}
      accessories={accessories}
      keywords={keywords}
      actions={<WorkflowRunActions workflowRun={workflowRun} repository={repository} mutateList={mutateList} />}
    />
  );
}
