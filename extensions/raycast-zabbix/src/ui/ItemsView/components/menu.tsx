import * as React from "react";
import * as Types from "@ui/types";
import * as Context from "@ui/ItemsView/context";
import { Action, ActionPanel, Keyboard } from "@raycast/api";
import {
  ActionOpenHistoryGraph,
  ActionRefresh,
  ActionShowDetail,
  ActionShowProblems,
} from "@ui/components/menu";

/* Action: Copy Item Value */
function ActionCopyItemValue({
  name,
  value,
  unit,
}: {
  name?: string;
  value?: string;
  unit?: string;
}): React.JSX.Element | undefined {
  if (!name || !value) return;

  return (
    <Action.CopyToClipboard
      title="Copy Item Value"
      content={`${name}: ${value} ${unit ?? ""}`.trim()}
      shortcut={Keyboard.Shortcut.Common.Copy}
    />
  );
}

/* ActionMenu */
export function ActionMenu({
  value,
}: {
  value?: Types.DataItemsView;
}): React.JSX.Element {
  /* Context */
  const ctxZabbixServer = React.useContext(Context.ZabbixServer);

  const activeTriggers = React.useMemo(() => {
    if (!value?.triggers?.length) return;
    return value.triggers
      .filter((v) => v.status === "0" && v.value === "1")
      .map((v) => v.triggerid);
  }, [value?.triggers]);

  return (
    <ActionPanel>
      <ActionPanel.Section title="Items">
        <ActionShowDetail />
        <ActionRefresh />
        <ActionCopyItemValue
          name={value?.name_resolved}
          value={value?.lastvalue}
          unit={value?.units}
        />
        {activeTriggers?.length ? (
          <ActionShowProblems
            serverUUID={value?.server_uuid}
            hostid={value?.hostid}
            triggerids={activeTriggers}
          />
        ) : undefined}
        {ctxZabbixServer.value && value && (
          <ActionOpenHistoryGraph
            config={[ctxZabbixServer.value]}
            uuid={ctxZabbixServer.value.uuid}
            items={[value]}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
