import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { PriorityEnum } from "@makeplane/plane-node-sdk";
import { useProject } from "../hooks/useProjects";
import { getStateIcon, priorityToIcon } from "../helpers/icons";
import { format } from "date-fns";
import { getWorkItemBrowseUrl } from "../helpers/work-items";
import { getWorkItemIdentifier } from "../helpers/work-items";
import { useStates } from "../hooks/useStates";
import { parseHtmlToMarkdown } from "../helpers/parser";
import { useWorkItemDetail } from "../hooks/useWorkItemDetail";
import WorkItemActions from "./actions/WorkItemActions";
import { capitalizeString } from "../helpers/strings";

export type WorkItemDetailProps = {
  slug: string;
  projectId: string;
  workItemId: string;
  mutateWorkItemList: () => void;
};

export default function WorkItemDetail({ slug, projectId, workItemId, mutateWorkItemList }: WorkItemDetailProps) {
  const { project, isLoading: isLoadingProject } = useProject(projectId);
  const { states, isLoading: isLoadingStates } = useStates(projectId, { execute: !!projectId });
  const { data: workItem, isLoading: isLoadingWorkItem, mutate } = useWorkItemDetail(workItemId, projectId);

  let markdown = `# ${workItem?.name}`;

  if (workItem?.descriptionHtml) {
    const descriptionMarked = parseHtmlToMarkdown(workItem.descriptionHtml);
    markdown += `\n\n${descriptionMarked}`;
  }

  // derived values
  const state = states?.find((state) => state.id === workItem?.state);

  const mutateWorkItemDetail = () => {
    mutate();
    mutateWorkItemList();
  };

  return (
    <Detail
      markdown={!workItem ? "" : markdown}
      isLoading={isLoadingProject || isLoadingStates || isLoadingWorkItem}
      {...(project && workItem
        ? {
            metadata: (
              <Detail.Metadata>
                {state && <Detail.Metadata.Label title="State" text={state.name} icon={getStateIcon(state)} />}

                <Detail.Metadata.Label
                  title="Priority"
                  text={capitalizeString(workItem.priority?.toString())}
                  icon={priorityToIcon(workItem.priority as PriorityEnum)}
                />

                {workItem.targetDate ? (
                  <Detail.Metadata.Label
                    title="Due Date"
                    text={format(new Date(workItem.targetDate), "MM/dd/yyyy")}
                    icon={Icon.Calendar}
                  />
                ) : null}

                <Detail.Metadata.Separator />

                <Detail.Metadata.Label title="Project" text={project?.name} icon={Icon.Folder} />
              </Detail.Metadata>
            ),
            actions: (
              <ActionPanel>
                <Action.OpenInBrowser url={getWorkItemBrowseUrl(slug, project, workItem)} />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={getWorkItemBrowseUrl(slug, project, workItem)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Identifier"
                  content={getWorkItemIdentifier(project, workItem)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                />
                {workItem && <WorkItemActions workItem={workItem} mutateWorkItemDetail={mutateWorkItemDetail} />}
              </ActionPanel>
            ),
          }
        : {})}
    />
  );
}
