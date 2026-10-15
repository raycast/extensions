import { Action, ActionPanel, Icon, launchCommand, LaunchType, List, updateCommandMetadata } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import AuthorizedView from "./components/AuthorizedView";
import WorkItemsByStateList from "./components/WorkItemsByStateList";
import { useMyWorkItems } from "./hooks/useMyWorkItems";
import { applyWorkItemChange } from "./helpers/work-item-summary";
import { WorkItemMutator } from "./components/actions/WorkItemActions";
import { MyWorkItemsFilter } from "./helpers/my-work-items";

const VIEW_OPTIONS: Record<MyWorkItemsFilter, { title: string; icon: Icon; empty: string }> = {
  assigned: { title: "Assigned to Me", icon: Icon.Person, empty: "Nothing assigned to you" },
  created: { title: "Created by Me", icon: Icon.Pencil, empty: "You haven't created any open work items" },
};

const VIEWS: MyWorkItemsFilter[] = ["assigned", "created"];

function MyWorkItems() {
  const [view, setView] = useCachedState<MyWorkItemsFilter>("my-work-items:view", "assigned");
  const { data, isLoading, error, revalidate, mutate } = useMyWorkItems(view);
  const meId = data?.me?.id;
  // With keepPreviousData, `data` can still belong to the previous view while the new one loads.
  const items = data?.view === view ? data.items : [];

  // The live count lives in "My Open Work Items" (a no-view command on a 15-minute timer). Clear any count this
  // list showed in earlier versions, and refresh that command whenever fresh assigned data arrives; it reuses
  // this result, so it costs no extra requests.
  useEffect(() => {
    updateCommandMetadata({ subtitle: null }).catch(() => undefined);
  }, []);
  const assignedFetchedAt = data?.view === "assigned" ? data.fetchedAt : undefined;
  useEffect(() => {
    if (!assignedFetchedAt) return;
    launchCommand({ name: "work-items-count", type: LaunchType.Background }).catch(() => undefined);
  }, [assignedFetchedAt]);

  const mutator: WorkItemMutator = (workItemId, request, change) =>
    mutate(request, {
      optimisticUpdate: (current) =>
        current && {
          ...current,
          items: current.items.map((item) => (item.id === workItemId ? applyWorkItemChange(item, change) : item)),
        },
    });

  const footer =
    data?.view === view && data.truncated ? (
      <List.Section title="Coverage">
        <List.Item
          icon={Icon.Info}
          title="Older work items may be missing"
          subtitle={data.coverage}
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      </List.Section>
    ) : null;

  return (
    <WorkItemsByStateList
      items={items}
      isLoading={isLoading}
      error={error}
      onRefresh={revalidate}
      mutate={mutator}
      currentUserId={meId}
      showProject
      toggleKey="my-work-items"
      navigationTitle="My Work Items"
      emptyTitle={VIEW_OPTIONS[view].empty}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={view} onChange={(value) => setView(value as MyWorkItemsFilter)}>
          {VIEWS.map((option) => (
            <List.Dropdown.Item
              key={option}
              title={VIEW_OPTIONS[option].title}
              value={option}
              icon={VIEW_OPTIONS[option].icon}
            />
          ))}
        </List.Dropdown>
      }
      footer={footer}
    />
  );
}

export default function Command() {
  return (
    <AuthorizedView>
      <MyWorkItems />
    </AuthorizedView>
  );
}
