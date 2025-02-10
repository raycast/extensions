import { Action, ActionPanel, Cache, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useMemo } from "react";
import { useCCalendarList } from "./hooks/useCCalendarList";
import { CacheKey, CCalendarList } from "./types/calendar";
import { MutatePromise } from "@raycast/utils";

export default function Command() {
  const { data: cCalendarListData, isLoading, mutate } = useCCalendarList();

  const cCalendarList = useMemo(() => {
    return cCalendarListData || [];
  }, [cCalendarListData]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder={"Search list"}>
      {cCalendarList.map((cCalendarItemList) => (
        <List.Section title={cCalendarItemList.type} key={cCalendarItemList.type}>
          {cCalendarItemList.list.map((cCalendarItem, index) => (
            <List.Item
              key={cCalendarItem.id + index}
              title={cCalendarItem.title}
              icon={{ source: cCalendarItem.enabled ? Icon.CheckCircle : Icon.Circle, tintColor: cCalendarItem.color }}
              accessories={[{ tag: { value: cCalendarItem.source, color: cCalendarItem.color } }]}
              actions={
                <ActionPanel>
                  <ActionsOnCCalendarItem
                    cCalendarListIndex={cCalendarList.indexOf(cCalendarItemList)}
                    list={cCalendarList}
                    index={index}
                    enabled={cCalendarItem.enabled}
                    color={cCalendarItem.color}
                    mutate={mutate}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function ActionsOnCCalendarItem(props: {
  cCalendarListIndex: number;
  list: CCalendarList[];
  index: number;
  enabled: boolean;
  color: string;
  mutate: MutatePromise<CCalendarList[] | undefined, CCalendarList[] | undefined>;
}) {
  const { cCalendarListIndex, list, index, enabled, color, mutate } = props;
  return (
    <>
      <ActionPanel.Section>
        <Action
          icon={{ source: enabled ? Icon.Circle : Icon.CheckCircle, tintColor: color }}
          title={enabled ? "Disable" : "Enable"}
          onAction={async () => {
            const cache = new Cache();
            const list_ = [...list];
            list_[cCalendarListIndex].list[index].enabled = !enabled;
            cache.set(CacheKey.CONFIGURE_LIST_ITEMS, JSON.stringify(list_));
            await mutate();
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          icon={Icon.Gear}
          title="Configure Extension"
          shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
          onAction={openExtensionPreferences}
        />
      </ActionPanel.Section>
    </>
  );
}
