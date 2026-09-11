import * as React from "react";
import * as Types from "@ui/types";
import * as LocalStorageKey from "@ui/localstorage";
import * as ContextGlobal from "@ui/context";
import * as Context from "@ui/ProblemsView/context";
import * as KeyboardCustom from "@ui/keyboard";
import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import {
  ActionConfigureHost,
  ActionConfigureTrigger,
  ActionPanelSectionZabbixServer,
  ActionRefresh,
  ActionShowDetail,
  ActionOpenHistoryGraph,
} from "@ui/components/menu";
import { useLocalStorage } from "@raycast/utils";
import { AcknowledgeForm } from "@ui/AcknowledgeForm/main";
import { CustomProblemForm } from "@ui/CustomProblemForm/main";
import { ItemsView } from "@ui/ItemsView/main";
import { ZabbixParamsItemGet, ZabbixObjectItem } from "@api/zabbix/types";

/* Action: Push AcknowledgeForm */
function ActionUpdateProblem({
  configArray,
  uuid,
  eventId,
  eventName,
  isLoading,
}: {
  configArray?: Types.LocalStorageZabbixServer[];
  uuid?: string;
  eventId?: string;
  eventName?: string;
  isLoading: boolean;
}): React.JSX.Element | undefined {
  const config = React.useMemo(() => {
    return configArray?.find((v) => v.uuid === uuid);
  }, [configArray, uuid]);
  if (!config) return;

  const ctx = React.useContext(ContextGlobal.HandleRevalidateData);

  if (isLoading || !configArray || !uuid || !eventId || !eventName) return;
  return (
    <Action.Push
      title="Update Problem"
      icon={Icon.SpeechBubble}
      shortcut={KeyboardCustom.UpdateProblem}
      target={
        <AcknowledgeForm
          config={config}
          eventId={eventId}
          eventName={eventName}
          revalidateData={ctx.revalidateData}
        />
      }
    />
  );
}

/* Action: Copy Host Name */
function ActionCopyHostName({
  value,
}: {
  value?: string;
}): React.JSX.Element | undefined {
  if (!value) return;

  return (
    <Action.CopyToClipboard
      title="Copy Host Name"
      content={value}
      shortcut={Keyboard.Shortcut.Common.Copy}
    />
  );
}

/* Action: Copy Problem Name */
function ActionCopyProblemName({
  value,
}: {
  value?: string;
}): React.JSX.Element | undefined {
  if (!value) return;

  return (
    <Action.CopyToClipboard
      title="Copy Problem Name"
      content={value}
      shortcut={Keyboard.Shortcut.Common.CopyName}
    />
  );
}

/* Action: Open Event */
function ActionOpenEvent({
  config,
  uuid,
  eventid,
  triggerid,
}: {
  config?: Types.LocalStorageZabbixServer[];
  uuid?: string;
  eventid?: string;
  triggerid?: string;
}) {
  const url = React.useMemo(() => {
    if (!uuid || !config?.length || !eventid || !triggerid) return;
    return config
      .find((v) => v.uuid === uuid)
      ?.url?.replace(
        "api_jsonrpc.php",
        `tr_events.php?triggerid=${triggerid}&eventid=${eventid}`,
      );
  }, [uuid, config, eventid, triggerid]);
  if (!url) return;

  return (
    <Action.OpenInBrowser
      title="Open Event in Browser"
      url={url}
      shortcut={Keyboard.Shortcut.Common.Open}
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
    return {
      itemids,
    } as ZabbixParamsItemGet;
  }, [itemids]);

  if (!uuid || !hostid || !items?.length) return;
  return (
    <Action.Push
      title="Show Problem Items"
      icon={Icon.MagnifyingGlass}
      target={<ItemsView serverUUID={uuid} params={params} />}
      shortcut={KeyboardCustom.ShowLatestData}
    />
  );
}

/* Action : Set min_Severity */
function ActionSetMinSeverity(): React.JSX.Element | undefined {
  /* Context */
  const ctxHandleRevalidateData = React.useContext(
    ContextGlobal.HandleRevalidateData,
  );
  const ctxSelectedServer = React.useContext(ContextGlobal.SelectedServer);

  const LocalStorageKeyMinSeverity = React.useMemo(() => {
    if (!ctxSelectedServer.value) return;
    return LocalStorageKey.KeyProblemsMinSeverity(ctxSelectedServer.value);
  }, [ctxSelectedServer.value]);
  if (!LocalStorageKeyMinSeverity) return;

  const textCurrentMinSeverity = " (Active)";

  const {
    value: MinSeverity,
    setValue: SetMinSeverity,
    isLoading: IsLoadingMinSeverity,
  } = useLocalStorage<number>(LocalStorageKeyMinSeverity, 3);

  const setSeverity = React.useCallback(
    async (value: number) => {
      /* Exit if value isn't changed */
      if (MinSeverity === value) return;

      /* Set Min Severity and Revalidate Data */
      await SetMinSeverity(value);
      await ctxHandleRevalidateData.revalidateData();
    },
    [MinSeverity, SetMinSeverity, ctxHandleRevalidateData],
  );

  const IsLoading = React.useMemo(() => {
    return ctxHandleRevalidateData.isLoading || IsLoadingMinSeverity;
  }, [ctxHandleRevalidateData.isLoading, IsLoadingMinSeverity]);
  if (IsLoading) return;

  return (
    <ActionPanel.Submenu title="Set Minimum Severity" icon={Icon.Filter}>
      <Action
        title={`Not Classified${MinSeverity === 0 ? textCurrentMinSeverity : ""}`}
        icon={Icon.Info}
        autoFocus={MinSeverity === 0 ? true : false}
        onAction={async () => await setSeverity(0)}
        key={0}
      />
      <Action
        title={`Info${MinSeverity === 1 ? textCurrentMinSeverity : ""}`}
        icon={Icon.Info}
        autoFocus={MinSeverity === 1 ? true : false}
        onAction={async () => await setSeverity(1)}
        key={1}
      />
      <Action
        title={`Warning${MinSeverity === 2 ? textCurrentMinSeverity : ""}`}
        icon={Icon.Warning}
        autoFocus={MinSeverity === 2 ? true : false}
        onAction={async () => await setSeverity(2)}
        key={2}
      />
      <Action
        title={`Average${MinSeverity === 3 ? textCurrentMinSeverity : ""}`}
        icon={Icon.Warning}
        autoFocus={MinSeverity === 3 ? true : false}
        onAction={async () => await setSeverity(3)}
        key={3}
      />
      <Action
        title={`High${MinSeverity === 4 ? textCurrentMinSeverity : ""}`}
        icon={Icon.XMarkCircle}
        autoFocus={MinSeverity === 4 ? true : false}
        onAction={async () => await setSeverity(4)}
        key={4}
      />
      <Action
        title={`Disaster${MinSeverity === 5 ? textCurrentMinSeverity : ""}`}
        icon={Icon.XMarkCircle}
        autoFocus={MinSeverity === 5 ? true : false}
        onAction={async () => await setSeverity(5)}
        key={5}
      />
    </ActionPanel.Submenu>
  );
}

/* Action: Toggle Show Ack */
function ActionShowAck(): React.JSX.Element | undefined {
  const ctx = React.useContext(Context.DataFilterOptionsShowAck);
  if (ctx.isLoading || ctx.value === undefined) return;

  return (
    <Action
      title={ctx.value ? "Hide Acknowledged" : "Show Acknowledged"}
      icon={Icon.Filter}
      onAction={async () => await ctx.setValue(!ctx.value)}
    />
  );
}

/* Action: Create Quicklink Custom Problems */
function ActionQuicklinkCreateCustomProblems(): React.JSX.Element {
  return (
    <Action.Push
      title="Create Quicklink (Custom Problems)"
      icon={Icon.Link}
      target={<CustomProblemForm />}
    />
  );
}

/* ActionMenu */
export function ActionMenu({
  isLoading,
  setZabbixServer,
  zabbixServer,
  value,
}: {
  isLoading: boolean;
  setZabbixServer?: (value: Types.LocalStorageZabbixServer[]) => Promise<void>;
  zabbixServer?: Types.LocalStorageZabbixServer[];
  value?: Types.DataProblemsView;
}): React.JSX.Element {
  /* Context */
  const ctxProps = React.useContext(Context.Props);
  const ctxSelectedServer = React.useContext(ContextGlobal.SelectedServer);
  const ctxHandleRevalidateData = React.useContext(
    ContextGlobal.HandleRevalidateData,
  );

  return (
    <ActionPanel>
      <ActionPanel.Section title="Problems">
        <ActionShowDetail />
        <ActionRefresh />
        <ActionUpdateProblem
          isLoading={isLoading}
          configArray={zabbixServer}
          uuid={value?.server_uuid}
          eventId={value?.lastEvent?.eventid}
          eventName={value?.lastEvent?.name}
        />
        <ActionCopyHostName value={value?.hosts?.at(0)?.name} />
        <ActionCopyProblemName value={value?.lastEvent?.name} />
        <ActionShowItems
          uuid={value?.server_uuid}
          hostid={value?.hosts?.at(0)?.hostid}
          items={value?.items}
        />
        <ActionOpenEvent
          config={zabbixServer}
          uuid={value?.server_uuid}
          eventid={value?.lastEvent?.eventid}
          triggerid={value?.triggerid}
        />
        <ActionOpenHistoryGraph
          config={zabbixServer}
          uuid={value?.server_uuid}
          items={value?.items}
        />
        {!ctxProps.server && <ActionSetMinSeverity />}
        {!ctxProps.server && <ActionShowAck />}
        <ActionConfigureHost
          config={zabbixServer}
          uuid={value?.server_uuid}
          isLoading={isLoading}
          revalidateData={ctxHandleRevalidateData.revalidateData}
          value={value?.hosts?.at(0)}
        />
        <ActionConfigureTrigger
          config={zabbixServer}
          uuid={value?.server_uuid}
          id={value?.triggerid}
          isLoading={isLoading}
          revalidateData={ctxHandleRevalidateData.revalidateData}
        />
        <ActionQuicklinkCreateCustomProblems />
      </ActionPanel.Section>
      {!isLoading &&
        setZabbixServer &&
        (!ctxProps.server || !ctxProps.params) && (
          <ActionPanelSectionZabbixServer
            setZabbixServer={setZabbixServer}
            zabbixServer={zabbixServer}
            selectedZabbixServer={ctxSelectedServer.value}
            setSelectedZabbixServer={ctxSelectedServer.setValue}
          />
        )}
    </ActionPanel>
  );
}
