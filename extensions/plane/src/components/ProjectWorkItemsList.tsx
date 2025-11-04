import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useProjectWorkItems } from "../hooks/useProjectWorkItems";
import { Project } from "@makeplane/plane-node-sdk";
import { parseHtmlToMarkdown } from "../helpers/parser";
import { getWorkItemBrowseUrl } from "../helpers/work-items";
import { planeClient } from "../api/auth";

export default function ProjectWorkItemsList({ projectItem }: { projectItem: Project }) {
  const { isLoading, workItems, pagination } = useProjectWorkItems(projectItem.id as string);
  return (
    <List isLoading={isLoading} isShowingDetail pagination={pagination} searchBarPlaceholder="Search work items">
      {workItems.map((workItem, i) => (
        <List.Item
          key={i}
          icon={Icon.BullsEye}
          title={workItem.name}
          subtitle={`${projectItem.identifier} ${workItem.sequenceId}`}
          detail={
            <List.Item.Detail
              markdown={`# ${workItem.name} \n\n --- \n\n ${parseHtmlToMarkdown(workItem.descriptionHtml ?? "")}`}
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={getWorkItemBrowseUrl(planeClient?.workspaceSlug ?? "", projectItem, workItem)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
