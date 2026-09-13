/* eslint-disable @raycast/prefer-title-case -- action titles intentionally keep acronyms/product terms uppercase (ID, ADO, AI) */
import {
  Action,
  ActionPanel,
  Icon,
  List,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { clearAdoCache, getMyTickets } from "./lib/ado";
import { setDeferred } from "./lib/storage";
import { statusColor } from "./lib/status";
import { StatusSubmenu } from "./lib/status-actions";
import { useLocalLayer } from "./lib/use-local-layer";
import { markWorkItemDone, typeIcon, workItemAccessories } from "./lib/ui";
import { Preferences, WorkItem } from "./lib/types";

const NO_ITERATION = "Backlog / No Iteration";
const DEFERRED_SECTION = "Deferred";

function iterationLabel(item: WorkItem): string {
  if (!item.iterationPath) return NO_ITERATION;
  const parts = item.iterationPath.split("\\");
  return parts[parts.length - 1] || item.iterationPath;
}

export default function MyTickets() {
  const { doneState } = getPreferenceValues<Preferences>();

  const { data, isLoading, revalidate } = useCachedPromise(getMyTickets, [], {
    keepPreviousData: true,
  });

  const { statusOf, deferred, revalidateLocal } = useLocalLayer();

  const items = data ?? [];
  const active = items.filter((i) => !deferred.has(i.id));
  const shelved = items.filter((i) => deferred.has(i.id));

  const groups = new Map<string, WorkItem[]>();
  for (const item of active) {
    const label = iterationLabel(item);
    const list = groups.get(label) ?? [];
    list.push(item);
    groups.set(label, list);
  }
  const sections = [...groups.entries()].sort(([a], [b]) => {
    if (a === NO_ITERATION) return 1;
    if (b === NO_ITERATION) return -1;
    return a.localeCompare(b);
  });

  async function toggleDeferred(item: WorkItem, defer: boolean) {
    await setDeferred(item.id, defer);
    await revalidateLocal();
    await showToast({
      style: Toast.Style.Success,
      title: defer ? `#${item.id} deferred` : `#${item.id} restored`,
    });
  }

  async function markDone(item: WorkItem) {
    if (await markWorkItemDone(item.id, doneState)) revalidate();
  }

  function row(item: WorkItem, isDeferred: boolean) {
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
            {isDeferred ? (
              <Action
                title="Un-Defer"
                icon={Icon.Tray}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={() => toggleDeferred(item, false)}
              />
            ) : (
              <Action
                title="Defer"
                icon={Icon.EyeDisabled}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={() => toggleDeferred(item, true)}
              />
            )}
            <Action.CopyToClipboard title="Copy ID" content={`#${item.id}`} />
            <Action.CopyToClipboard title="Copy Title" content={item.title} />
            {!isDeferred && (
              <Action
                title={`Mark Done in ADO (${doneState})`}
                icon={Icon.CheckCircle}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                onAction={() => markDone(item)}
              />
            )}
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
      navigationTitle={`My Tickets — ${active.length} open`}
      searchBarPlaceholder="Filter your open tickets"
    >
      {sections.map(([label, sectionItems]) => (
        <List.Section
          key={label}
          title={label}
          subtitle={`${sectionItems.length}`}
        >
          {sectionItems.map((i) => row(i, false))}
        </List.Section>
      ))}
      {shelved.length > 0 && (
        <List.Section title={DEFERRED_SECTION} subtitle={`${shelved.length}`}>
          {shelved.map((i) => row(i, true))}
        </List.Section>
      )}
      {!isLoading && items.length === 0 && (
        <List.EmptyView
          icon={Icon.Tray}
          title="No open tickets"
          description="Nothing assigned to you right now."
        />
      )}
    </List>
  );
}
