import * as React from "react";
import * as Types from "@ui/types";
import * as KeyboardCustom from "@ui/keyboard";
import * as ContextGlobal from "@ui/context";
import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import {
  ActionConfigureHost,
  ActionPanelSectionZabbixServer,
  ActionRefresh,
  ActionShowDetail,
  ActionShowProblems,
} from "@ui/components/menu";
import { ZabbixParamsItemGet, ZabbixParamsTriggerGet } from "@api/zabbix/types";
import { ItemsView } from "@ui/ItemsView/main";
import { TriggersView } from "@ui/TriggersView/main";

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

/* Action: Copy IP */
function ActionCopyIP({
  value,
  dnsIsDefined,
}: {
  value?: string;
  dnsIsDefined: boolean;
}): React.JSX.Element | undefined {
  if (!value) return;

  return (
    <Action.CopyToClipboard
      title="Copy Host IP"
      content={value}
      shortcut={!dnsIsDefined ? Keyboard.Shortcut.Common.CopyName : undefined}
    />
  );
}

/* Action: Copy DNS */
function ActionCopyDNS({
  value,
  ipIsDefined,
}: {
  value?: string;
  ipIsDefined: boolean;
}): React.JSX.Element | undefined {
  if (!value) return;

  return (
    <Action.CopyToClipboard
      title="Copy Host DNS"
      content={value}
      shortcut={!ipIsDefined ? Keyboard.Shortcut.Common.CopyName : undefined}
    />
  );
}

/* Action: Show Items */
function ActionShowItems({
  uuid,
  hostid,
}: {
  uuid?: string;
  hostid?: string;
}): React.JSX.Element | undefined {
  const params = React.useMemo(() => {
    return {
      hostids: [hostid],
    } as ZabbixParamsItemGet;
  }, [hostid]);

  if (!uuid || !hostid) return;
  return (
    <Action.Push
      title="Show Latest Data"
      icon={Icon.MagnifyingGlass}
      target={<ItemsView serverUUID={uuid} params={params} />}
      shortcut={KeyboardCustom.ShowLatestData}
    />
  );
}

/* Action: Show Triggers */
function ActionShowTriggers({
  uuid,
  hostid,
}: {
  uuid?: string;
  hostid?: string;
}): React.JSX.Element | undefined {
  const params = React.useMemo(() => {
    return {
      hostids: [hostid],
    } as ZabbixParamsTriggerGet;
  }, [hostid]);

  if (!uuid || !hostid) return;
  return (
    <Action.Push
      title="Show Triggers"
      icon={Icon.MagnifyingGlass}
      target={<TriggersView serverUUID={uuid} params={params} />}
      shortcut={KeyboardCustom.ShowTriggers}
    />
  );
}

/* Action: Open Host */
function ActionOpenHost({
  config,
  uuid,
  hostid,
}: {
  config?: Types.LocalStorageZabbixServer[];
  uuid?: string;
  hostid?: string;
}) {
  const url = React.useMemo(() => {
    if (!uuid || !config?.length || !hostid) return;
    return config
      .find((v) => v.uuid === uuid)
      ?.url?.replace(
        "api_jsonrpc.php",
        `zabbix.php?action=host.edit&hostid=${hostid}`,
      );
  }, [uuid, config, hostid]);
  if (!url) return;

  return (
    <Action.OpenInBrowser
      title="Open Host in Browser"
      url={url}
      shortcut={Keyboard.Shortcut.Common.Open}
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
  value?: Types.DataHostsView;
}): React.JSX.Element {
  /* Context */
  const ctxSelectedServer = React.useContext(ContextGlobal.SelectedServer);
  const ctxHandleRevalidateData = React.useContext(
    ContextGlobal.HandleRevalidateData,
  );

  const dns = React.useMemo(() => {
    if (!value?.interfaces?.length) return;
    return value.interfaces.filter((i) => i.dns && i.dns !== "").at(0)?.dns;
  }, [value?.interfaces]);

  const ip = React.useMemo(() => {
    if (!value?.interfaces?.length) return;
    return value.interfaces.filter((i) => i.ip && i.ip !== "").at(0)?.ip;
  }, [value?.interfaces]);

  return (
    <ActionPanel>
      <ActionPanel.Section title="Host">
        <ActionShowDetail />
        <ActionRefresh />
        <ActionCopyHostName value={value?.name} />
        <ActionCopyDNS value={dns} ipIsDefined={ip !== undefined} />
        <ActionCopyIP value={ip} dnsIsDefined={dns !== undefined} />
        <ActionShowItems uuid={value?.server_uuid} hostid={value?.hostid} />
        <ActionShowTriggers uuid={value?.server_uuid} hostid={value?.hostid} />
        <ActionShowProblems
          serverUUID={value?.server_uuid}
          hostid={value?.hostid}
        />
        <ActionOpenHost
          config={zabbixServer}
          uuid={value?.server_uuid}
          hostid={value?.hostid}
        />
        <ActionConfigureHost
          config={zabbixServer}
          uuid={value?.server_uuid}
          isLoading={isLoading}
          revalidateData={ctxHandleRevalidateData.revalidateData}
          value={value}
        />
      </ActionPanel.Section>
      {!isLoading && setZabbixServer && (
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
