/* eslint-disable @raycast/prefer-title-case -- action titles intentionally keep acronyms/product terms uppercase (ID, ADO, AI) */
import {
  Action,
  ActionPanel,
  Icon,
  List,
  getPreferenceValues,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { clearAdoCache, getMySprintItems } from "./lib/ado";
import { statusColor } from "./lib/status";
import { StatusSubmenu } from "./lib/status-actions";
import { useLocalLayer } from "./lib/use-local-layer";
import { markWorkItemDone, typeIcon, workItemAccessories } from "./lib/ui";
import { Preferences, WorkItem } from "./lib/types";

export default function MySprint() {
  const { doneState } = getPreferenceValues<Preferences>();

  const { data, isLoading, revalidate } = useCachedPromise(
    getMySprintItems,
    [],
    { keepPreviousData: true },
  );

  const { statusOf, deferred, revalidateLocal } = useLocalLayer();

  const items = (data ?? []).filter((i) => !deferred.has(i.id));
  const done = items.filter((i) => statusOf(i.id) === "done").length;
  const total = items.length;

  const open = items.filter((i) => statusOf(i.id) !== "done");
  const finished = items.filter((i) => statusOf(i.id) === "done");

  async function markDone(item: WorkItem) {
    if (await markWorkItemDone(item.id, doneState)) revalidate();
  }

  function row(item: WorkItem) {
    const status = statusOf(item.id);
    return (
      <List.Item
        key={item.id}
        icon={{
          source: typeIcon(item.type),
          tintColor: statusColor(status),
        }}
        title={item.title}
        subtitle={`#${item.id}`}
        accessories={workItemAccessories(item, status)}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={item.url} />
            <StatusSubmenu
              id={item.id}
              current={status}
              onChange={revalidateLocal}
              allowMoveToToday
            />
            <Action.CopyToClipboard title="Copy ID" content={`#${item.id}`} />
            <Action.CopyToClipboard title="Copy Title" content={item.title} />
            <Action
              title={`Mark Done in ADO (${doneState})`}
              icon={Icon.CheckCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onAction={() => markDone(item)}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={async () => {
                await clearAdoCache();
                revalidate();
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`My Sprint — ${done}/${total} done`}
      searchBarPlaceholder="Filter your sprint work items"
    >
      <List.Section title="In Progress / To Do" subtitle={`${open.length}`}>
        {open.map(row)}
      </List.Section>
      <List.Section title="Done" subtitle={`${finished.length}`}>
        {finished.map(row)}
      </List.Section>
      {!isLoading && total === 0 && (
        <List.EmptyView
          icon={Icon.Tray}
          title="No work items in the current sprint"
          description="Check your org / project / team in preferences."
        />
      )}
    </List>
  );
}
