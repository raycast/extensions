import { IssueSearchItem } from "@makeplane/plane-node-sdk";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getWorkItemUrlWithIdentifier } from "../helpers/work-items";
import WorkItemDetail from "./WorkItemDetail";

type WorkItemListItemProps = {
  workItem: IssueSearchItem;
  mutateWorkItemList: () => void;
};

export default function WorkItemListItem({ workItem, mutateWorkItemList }: WorkItemListItemProps) {
  const keywords: string[] = [workItem.name, workItem.sequenceId?.toString() || ""];

  const workItemIdentifier = `${workItem.projectIdentifier}-${workItem.sequenceId}`;

  const accesories = [
    {
      text: workItemIdentifier,
      icon: Icon.BullsEye,
    },
  ];

  return (
    <List.Item
      title={workItem.name}
      accessories={accesories}
      keywords={keywords}
      actions={
        <ActionPanel title={workItemIdentifier}>
          <Action.Push
            title="Open Work Item"
            target={
              <WorkItemDetail
                slug={workItem.workspaceSlug}
                projectId={workItem.projectId}
                workItemId={workItem.id}
                mutateWorkItemList={mutateWorkItemList}
              />
            }
          />
          <Action.OpenInBrowser url={getWorkItemUrlWithIdentifier(workItem.workspaceSlug, workItemIdentifier)} />
        </ActionPanel>
      }
    />
  );
}
