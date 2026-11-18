import * as React from "react";
import * as Types from "@ui/types";
import * as Context from "@ui/TriggersView/context";
import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import {
  ActionOpenHistoryGraph,
  ActionRefresh,
  ActionShowDetail,
} from "@ui/components/menu";
import { ZabbixParamsItemGet, ZabbixObjectItem } from "@api/zabbix/types";
import { ItemsView } from "@ui/ItemsView/main";
import * as KeyboardCustom from "@ui/keyboard";
import { ActionConfigureTrigger } from "@ui/components/menu";

/* Action: Copy Trigger Name */
function ActionCopyTriggerName({
  value,
}: {
  value?: string;
}): React.JSX.Element | undefined {
  if (!value) return;
  return (
    <Action.CopyToClipboard
      title="Copy Trigger Name"
      content={value}
      shortcut={Keyboard.Shortcut.Common.Copy}
    />
  );
}

/* Action: Show Items */
function ActionShowItems({
  uuid,
  hostid,
  items,
}: {
  uuid?: string;
  hostid?: string;
  items?: ZabbixObjectItem[];
}): React.JSX.Element | undefined {
  const itemids = React.useMemo(() => items?.map((i) => i.itemid), [items]);
  const params = React.useMemo(() => {
    return { itemids } as ZabbixParamsItemGet;
  }, [itemids]);
  if (!uuid || !hostid || !items?.length) return;
  return (
    <Action.Push
      title="Show Trigger Items"
      icon={Icon.MagnifyingGlass}
      target={<ItemsView serverUUID={uuid} params={params} />}
      shortcut={KeyboardCustom.ShowLatestData}
    />
  );
}

/* ActionMenu */
export function ActionMenu({
  value,
}: {
  value?: Types.DataTriggersView;
}): React.JSX.Element {
  /* Context */
  const ctxZabbixServer = React.useContext(Context.ZabbixServer);

  const activeItems = React.useMemo(() => {
    if (!value?.items?.length) return;
    return value.items;
  }, [value?.items]);

  return (
    <ActionPanel>
      <ActionPanel.Section title="Triggers">
        <ActionShowDetail />
        <ActionRefresh />
        <ActionCopyTriggerName value={value?.description} />
        {activeItems && ctxZabbixServer.value && (
          <ActionShowItems
            uuid={value?.server_uuid}
            hostid={value?.hosts?.at(0)?.hostid}
            items={activeItems}
          />
        )}
        {ctxZabbixServer.value && activeItems && (
          <ActionOpenHistoryGraph
            config={[ctxZabbixServer.value]}
            uuid={ctxZabbixServer.value.uuid}
            items={activeItems}
          />
        )}
        <ActionConfigureTrigger
          config={ctxZabbixServer.value ? [ctxZabbixServer.value] : undefined}
          uuid={value?.server_uuid}
          id={value?.triggerid}
          isLoading={false}
          revalidateData={async () => {}}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
