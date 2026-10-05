import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useRef, useState } from "react";

import { assignedTo, groupByState, StateGroup } from "./api/entities";
import { connect } from "./api/connect";
import { describeFailure } from "./api/failures";
import { Instance } from "./api/types";
import { EntityListItem } from "./components/EntityListItem";
import { InstanceDropdown } from "./components/InstanceDropdown";
import { NoInstances } from "./components/NoInstances";
import { useInstances } from "./hooks/useInstances";
import { PlatformShortcut } from "./shortcuts";

const TOGGLE_CLOSED: PlatformShortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "x" },
  Windows: { modifiers: ["ctrl", "shift"], key: "x" },
};

export default function MyWorkCommand() {
  const { instances, active, isLoading: loadingInstances, selectInstance } = useInstances();
  const [includeClosed, setIncludeClosed] = useState(false);
  const abortable = useRef<AbortController>(null);

  const { data, isLoading, error } = useCachedPromise(
    async (instanceId: string | undefined, includeFinal: boolean) => {
      const instance = instances.find((candidate) => candidate.id === instanceId);
      if (!instance) return [] as StateGroup[];

      const userId = await resolveUserId(instance, abortable.current?.signal);
      const items = await assignedTo(instance, userId, { includeFinal, signal: abortable.current?.signal });
      return groupByState(items);
    },
    [active?.id, includeClosed],
    { abortable, keepPreviousData: true, initialData: [] as StateGroup[] },
  );

  const groups = data ?? [];
  const failure = error ? describeFailure(error, active?.label) : null;
  const total = groups.reduce((count, group) => count + group.items.length, 0);

  const toggleClosed = (
    <Action
      title={includeClosed ? "Hide Closed Items" : "Show Closed Items"}
      icon={includeClosed ? Icon.EyeDisabled : Icon.Eye}
      shortcut={TOGGLE_CLOSED}
      onAction={() => setIncludeClosed((current) => !current)}
    />
  );

  return (
    <List
      isLoading={loadingInstances || isLoading}
      searchBarPlaceholder={`Filter ${total} assigned ${total === 1 ? "item" : "items"}`}
      searchBarAccessory={<InstanceDropdown instances={instances} value={active?.id} onChange={selectInstance} />}
    >
      {instances.length === 0 && !loadingInstances ? (
        <NoInstances />
      ) : failure ? (
        <List.EmptyView icon={Icon.Warning} title={failure.title} description={failure.message} />
      ) : (
        <>
          {active
            ? groups.map((group) => (
                <List.Section key={group.key} title={group.title} subtitle={String(group.items.length)}>
                  {group.items.map((item) => (
                    <EntityListItem key={item.id} item={item} baseUrl={active.baseUrl} extraActions={toggleClosed} />
                  ))}
                </List.Section>
              ))
            : null}

          <List.EmptyView
            icon={Icon.Checkmark}
            title="Nothing Assigned to You"
            description={
              includeClosed
                ? "No items are assigned to you on this instance."
                : "Nothing open is assigned to you. Closed items are hidden."
            }
            actions={<ActionPanel>{toggleClosed}</ActionPanel>}
          />
        </>
      )}
    </List>
  );
}

/** Records saved before the id was cached re-derive it rather than forcing a re-save. */
async function resolveUserId(instance: Instance, signal?: AbortSignal): Promise<number> {
  if (typeof instance.userId === "number") return instance.userId;
  const facts = await connect(instance, { signal });
  return facts.userId;
}
