import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { ReactNode } from "react";
import { WorkItemSummary } from "../api/types";
import { groupByStateGroup, isOpenStateGroup } from "../helpers/state-groups";
import WorkItemListItem from "./WorkItemListItem";
import ErrorEmptyView from "./ErrorEmptyView";
import { WorkItemMutator } from "./actions/WorkItemActions";
import ChangeWorkspaceAction from "./actions/ChangeWorkspaceAction";

type WorkItemsByStateListProps = {
  items: WorkItemSummary[];
  isLoading: boolean;
  error?: Error;
  onRefresh: () => void;
  mutate?: WorkItemMutator;
  currentUserId?: string;
  showProject?: boolean;
  navigationTitle?: string;
  searchBarPlaceholder?: string;
  searchBarAccessory?: List.Props["searchBarAccessory"];
  pagination?: List.Props["pagination"];
  emptyTitle: string;
  emptyDescription?: string;
  /** Key for remembering the "show completed" toggle per command. */
  toggleKey: string;
  /** Rendered after the grouped sections (e.g. a notice). */
  footer?: ReactNode;
};

/**
 * Work items in sections by state group: Triage → In Progress → Todo → Backlog → Done → Cancelled.
 * Done and Cancelled are hidden until toggled with ⌘⇧H.
 */
export default function WorkItemsByStateList({
  items,
  isLoading,
  error,
  onRefresh,
  mutate,
  currentUserId,
  showProject,
  navigationTitle,
  searchBarPlaceholder,
  searchBarAccessory,
  pagination,
  emptyTitle,
  emptyDescription,
  toggleKey,
  footer,
}: WorkItemsByStateListProps) {
  const [showClosed, setShowClosed] = useCachedState<boolean>(`show-closed:${toggleKey}`, false);
  const sections = groupByStateGroup(items, { includeClosed: showClosed });
  const closedCount = items.filter((item) => !isOpenStateGroup(item.state?.group)).length;

  const extraActions = (
    <>
      <Action
        title={showClosed ? "Hide Completed and Cancelled" : `Show Completed and Cancelled (${closedCount})`}
        icon={showClosed ? Icon.EyeDisabled : Icon.Eye}
        shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
        onAction={() => setShowClosed(!showClosed)}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={onRefresh}
      />
    </>
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      searchBarPlaceholder={searchBarPlaceholder ?? "Filter work items"}
      searchBarAccessory={searchBarAccessory}
      pagination={pagination}
    >
      {error && items.length === 0 ? (
        <ErrorEmptyView error={error} onRetry={onRefresh} />
      ) : (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title={emptyTitle}
          description={
            !showClosed && closedCount > 0
              ? `${closedCount} completed or cancelled work item(s) hidden. Press ⌘⇧H to show them.`
              : emptyDescription
          }
          actions={
            <ActionPanel>
              {extraActions}
              <ChangeWorkspaceAction />
            </ActionPanel>
          }
        />
      )}
      {sections.map((section) => (
        <List.Section key={section.group} title={section.title} subtitle={String(section.items.length)}>
          {section.items.map((item) => (
            <WorkItemListItem
              key={item.id}
              workItem={item}
              mutate={mutate}
              mutateWorkItemList={onRefresh}
              currentUserId={currentUserId}
              showProject={showProject}
              extraActions={extraActions}
            />
          ))}
        </List.Section>
      ))}
      {footer}
    </List>
  );
}
