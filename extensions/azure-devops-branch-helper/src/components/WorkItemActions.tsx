import { ActionPanel, Action, Icon } from "@raycast/api";
import { WorkItemDetails, WorkItemRelationsData } from "../types/work-item";

interface WorkItemActionsProps {
  workItem: WorkItemDetails | null;
  existingPR: {
    pullRequestId: number;
    title: string;
    project: string;
  } | null;
  workItemUrl: string;
  branchName: string;
  relations: WorkItemRelationsData;
  onRefresh: () => void;
  onActivateAndCreatePR: () => void;
  onActivateAndBranch: () => void;
  onCopyContextForAI: () => void;
  onAddComment: () => void;
  onLinkToFeature?: () => void;
  onOpenExistingPR: () => void;
  onBrowseRelated: () => void;
}

export default function WorkItemActions({
  workItem,
  existingPR,
  workItemUrl,
  branchName,
  relations,
  onRefresh,
  onActivateAndCreatePR,
  onActivateAndBranch,
  onCopyContextForAI,
  onAddComment,
  onLinkToFeature,
  onOpenExistingPR,
  onBrowseRelated,
}: WorkItemActionsProps) {
  if (!workItem) {
    return (
      <ActionPanel>
        <ActionPanel.Section title="View Actions">
          <Action
            title="Refresh"
            onAction={onRefresh}
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  const workItemType = workItem.fields["System.WorkItemType"].toLowerCase();
  const isStory =
    workItemType === "user story" ||
    workItemType === "product backlog item" ||
    workItemType === "pbi";
  const hasRelatedItems = !!(
    relations.parentItem ||
    relations.siblingItems.length > 0 ||
    relations.relatedItems.length > 0 ||
    relations.childItems.length > 0
  );

  return (
    <ActionPanel>
      <ActionPanel.Section title="Work Item Actions">
        {existingPR ? (
          <Action
            title="View Pull Request"
            onAction={onOpenExistingPR}
            icon={Icon.Eye}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
        ) : (
          <Action
            title="Activate & Create Pull Request"
            onAction={onActivateAndCreatePR}
            icon={Icon.PlusCircle}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
        )}

        <Action
          title="Activate & Create Branch"
          icon={Icon.Rocket}
          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          onAction={onActivateAndBranch}
        />

        <Action
          title="Copy Context for AI"
          onAction={onCopyContextForAI}
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />

        <Action
          title="Add Comment…"
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
          onAction={onAddComment}
        />

        {isStory && onLinkToFeature && (
          <Action
            title="Link to Feature…"
            icon={Icon.Link}
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
            onAction={onLinkToFeature}
          />
        )}

        {hasRelatedItems && (
          <Action
            title="Browse Related Items"
            icon={Icon.List}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            onAction={onBrowseRelated}
          />
        )}

        {Boolean(workItemUrl) && (
          <Action.OpenInBrowser
            title="Open in Azure Devops"
            url={workItemUrl}
            icon={Icon.Globe}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        )}

        <Action.CopyToClipboard
          title="Copy Work Item ID"
          content={workItem.id.toString()}
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />

        <Action.CopyToClipboard
          title="Copy Work Item Title"
          content={workItem.fields["System.Title"]}
          icon={Icon.Text}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
        />

        <Action.CopyToClipboard
          title="Copy Branch Name"
          content={branchName}
          icon={Icon.Code}
          shortcut={{ modifiers: ["cmd"], key: "b" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="View Actions">
        <Action
          title="Refresh"
          onAction={onRefresh}
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
