import { Action, ActionPanel, Icon, launchCommand, LaunchType, List, updateCommandMetadata } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import AuthorizedView from "./components/AuthorizedView";
import WorkItemsByStateList from "./components/WorkItemsByStateList";
import { useMyWorkItems } from "./hooks/useMyWorkItems";
import { getCachedCapabilities } from "./api/work-item-backend";
import { applyWorkItemChange } from "./helpers/work-item-summary";
import { WorkItemMutator } from "./components/actions/WorkItemActions";
import { BACKEND_LABELS, MyWorkItemsView, supportedViews } from "./helpers/work-item-backends";

const VIEW_OPTIONS: Record<MyWorkItemsView, { title: string; icon: Icon; empty: string }> = {
  assigned: { title: "Assigned to Me", icon: Icon.Person, empty: "Nothing assigned to you" },
  created: { title: "Created by Me", icon: Icon.Pencil, empty: "You haven't created any open work items" },
  subscribed: { title: "Subscribed", icon: Icon.Bell, empty: "No open work items you're subscribed to" },
  mentions: { title: "Mentioning Me", icon: Icon.AtSymbol, empty: "No open work items mention you" },
};

function MyWorkItems() {
  const [view, setView] = useCachedState<MyWorkItemsView>("my-work-items:view", "assigned");
  // Subscribed and Mentions need the server-side filters; the project scan can't serve them.
  const [available, setAvailable] = useState<MyWorkItemsView[]>(() => supportedViews(getCachedCapabilities()));
  const effectiveView = available.includes(view) ? view : "assigned";
  const { data, isLoading, error, revalidate, mutate } = useMyWorkItems(effectiveView);
  const meId = data?.me?.id;
  // With keepPreviousData, `data` can still belong to the previous view while the new one loads.
  const items = data?.view === effectiveView ? data.items : [];

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

  const supportedKey = data?.supportedViews?.join(",");
  useEffect(() => {
    if (data?.supportedViews) setAvailable(data.supportedViews);
  }, [supportedKey]);

  const mutator: WorkItemMutator = (workItemId, request, change) =>
    mutate(request, {
      optimisticUpdate: (current) =>
        current && {
          ...current,
          items: current.items.map((item) => (item.id === workItemId ? applyWorkItemChange(item, change) : item)),
        },
    });

  const footer =
    data?.view === effectiveView && data.truncated ? (
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
      emptyTitle={VIEW_OPTIONS[effectiveView].empty}
      sectionSubtitleSuffix={data?.view === effectiveView ? BACKEND_LABELS[data.backend] : undefined}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter"
          value={effectiveView}
          onChange={(value) => {
            // Raycast also fires onChange on mount; don't overwrite a stored view that isn't available yet.
            if (value !== effectiveView) setView(value as MyWorkItemsView);
          }}
        >
          {available.map((option) => (
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
