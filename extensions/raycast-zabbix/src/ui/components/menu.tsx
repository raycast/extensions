import * as React from "react";
import type * as Types from "@ui/types";
import * as KeyboardCustom from "@ui/keyboard";
import * as ContextGlobal from "@ui/context";
import { ServerForm } from "@ui/ServerForm/main";
import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  showToast,
  Toast,
} from "@raycast/api";
import { ClearLocalStorage } from "@ui/localstorage";
import { ZabbixClient } from "@api/zabbix/main";
import {
  ZabbixObjectHost,
  ZabbixObjectItem,
  ZabbixParamsTriggerGet,
} from "@api/zabbix/types";
import { ProblemsView } from "@ui/ProblemsView/main";

/* Action: Show Detail */
export function ActionShowDetail(): React.JSX.Element {
  const ctx = React.useContext(ContextGlobal.ShowDetail);
  return (
    <Action
      title={ctx.value ? "Hide Detail" : "Show Detail"}
      icon={Icon.Eye}
      shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
      onAction={() => {
        if (ctx.setValue) ctx.setValue((value) => !value);
      }}
    />
  );
}

/* Action: Refresh Data */
export function ActionRefresh(): React.JSX.Element | undefined {
  /* Context */
  const contextHandleRevalidateData = React.useContext(
    ContextGlobal.HandleRevalidateData,
  );
  if (contextHandleRevalidateData.isLoading) return;

  return (
    <Action
      title="Refresh"
      icon={Icon.RotateClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={contextHandleRevalidateData.revalidateData}
    />
  );
}

/* Action: Show Problems */
export function ActionShowProblems({
  serverUUID,
  hostid,
  triggerids,
}: {
  serverUUID?: string;
  hostid?: string;
  triggerids?: string[];
}): React.JSX.Element | undefined {
  const params = React.useMemo(() => {
    if (!serverUUID || !hostid) return undefined;
    return {
      hostids: [hostid],
      triggerids: triggerids,
      output: ["triggerid"],
      monitored: true,
      only_true: true,
      selectItems: ["itemid", "name_resolved", "lastvalue", "units"],
      selectLastEvent: ["name", "severity", "clock", "acknowledged"],
      selectHosts: ["name", "description"],
      sortfield: "lastchange",
      sortorder: "DESC",
    } as ZabbixParamsTriggerGet;
  }, [hostid]);

  if (!params) return;

  return (
    <Action.Push
      title="Show Problems"
      icon={Icon.MagnifyingGlass}
      target={<ProblemsView server={serverUUID} params={params} />}
      shortcut={KeyboardCustom.ShowProblems}
    />
  );
}

/* Open History Graph */
export function ActionOpenHistoryGraph({
  config,
  uuid,
  items,
}: {
  config?: Types.LocalStorageZabbixServer[];
  uuid?: string;
  items?: ZabbixObjectItem[];
}): React.JSX.Element | undefined {
  const url = React.useMemo(() => {
    if (!uuid || !config?.length) return;
    return config
      .find((v) => v.uuid === uuid)
      ?.url?.replace("api_jsonrpc.php", "history.php?action=showgraph");
  }, [uuid, config]);

  if (!url || !items?.length) return;
  if (items.length === 1)
    return (
      <Action.OpenInBrowser
        title="Open History Graph in Browser"
        url={`${url}&itemids%5B%5D=${items.at(0)!.itemid}`}
        shortcut={Keyboard.Shortcut.Common.OpenWith}
      />
    );
  return (
    <ActionPanel.Submenu
      title="Open History Graph in Browser"
      icon={Icon.Globe}
      shortcut={Keyboard.Shortcut.Common.OpenWith}
    >
      {items.map((v, i) =>
        v.name_resolved ? (
          <Action.OpenInBrowser
            title={v.name_resolved}
            url={`${url}&itemids%5B%5D=${v.itemid}`}
            key={i}
          />
        ) : undefined,
      )}
    </ActionPanel.Submenu>
  );
}

/* ActionPanel.Section "Zabbix Server"*/
interface ActionPanelSectionZabbixServerProps {
  setZabbixServer: (value: Types.LocalStorageZabbixServer[]) => Promise<void>;
  zabbixServer?: Types.LocalStorageZabbixServer[];
  selectedZabbixServer?: string;
  setSelectedZabbixServer: (value: string) => Promise<void>;
}
export function ActionPanelSectionZabbixServer({
  setZabbixServer,
  zabbixServer,
  selectedZabbixServer,
  setSelectedZabbixServer,
}: ActionPanelSectionZabbixServerProps): React.JSX.Element {
  /* Memo: showActionRemoveZabbixServer */
  const showActionRemoveZabbixServer = React.useMemo(() => {
    if (
      zabbixServer &&
      selectedZabbixServer &&
      selectedZabbixServer.toLowerCase() !== "all"
    )
      return true;
    return false;
  }, [zabbixServer, selectedZabbixServer]);

  /* Callback: RemoveZabbixServer */
  const handleRemoveServer = React.useCallback(async () => {
    if (!zabbixServer || !selectedZabbixServer) return;

    /* Structured Clone */
    const config = structuredClone(zabbixServer);

    /* Find Zabbix Server by Name and Remove */
    const index = config.findIndex((v) => v.uuid === selectedZabbixServer);
    if (index > -1) config.splice(index, 1);

    /* Change Selected Zabbix Server */
    if (config.length) await setSelectedZabbixServer(config.at(0)!.uuid);
    /* Clear LocalStorage */
    await ClearLocalStorage(selectedZabbixServer);

    /* Save new config */
    await setZabbixServer(config);
  }, [zabbixServer, selectedZabbixServer]);

  return (
    <ActionPanel.Section title="Zabbix Server">
      <Action.Push
        title="Add Server"
        icon={Icon.Plus}
        target={
          <ServerForm
            ZabbixServer={zabbixServer}
            SetZabbixServer={setZabbixServer}
            setSelectedServer={setSelectedZabbixServer}
          />
        }
      />
      {showActionRemoveZabbixServer && (
        <React.Fragment>
          <Action.Push
            title="Edit Current Server"
            icon={Icon.Pencil}
            target={
              <ServerForm
                ZabbixServer={zabbixServer}
                SetZabbixServer={setZabbixServer}
                selectedServer={selectedZabbixServer}
                setSelectedServer={setSelectedZabbixServer}
              />
            }
          />
          <ActionPanel.Submenu title="Remove Current Server" icon={Icon.Trash}>
            <Action
              title={`Yes, I Want to Remove "${zabbixServer!.find((v) => v.uuid === selectedZabbixServer)?.name}" Zabbix Server`}
              icon={Icon.Trash}
              onAction={handleRemoveServer}
              key={0}
            />
            <Action title="No" icon={Icon.Undo} key={1} />
          </ActionPanel.Submenu>
        </React.Fragment>
      )}
    </ActionPanel.Section>
  );
}

/* ActionPanel.Submenu: "Configure Trigger" */
export function ActionConfigureTrigger({
  config,
  uuid,
  id,
  isLoading,
  revalidateData,
}: {
  config?: Types.LocalStorageZabbixServer[];
  uuid?: string;
  id?: string;
  isLoading: boolean;
  revalidateData: () => Promise<void>;
}): React.JSX.Element | undefined {
  const [isLoadingAction, setIsLoadingAction] = React.useState(false);

  const handleChangeSeverity = React.useCallback(
    async (newSeverity: string) => {
      if (!config || !uuid || isLoadingAction) return;

      /* Get Config */
      const c = config.find((v) => v.uuid === uuid);
      if (!c) return;

      /* Show Loading Toast */
      setIsLoadingAction(true);
      await showToast({
        style: Toast.Style.Animated,
        title: "Changing Severity",
      });

      /* Change Severity */
      let severityChanged = false;
      const client = new ZabbixClient({ url: c.url, key: c.key });
      try {
        await client.MethodTriggerUpdate({
          triggerid: id,
          priority: newSeverity,
        });
        severityChanged = true;
        await showToast({
          style: Toast.Style.Success,
          title: "Changing Severity Complete",
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error Changing Severity",
          message: msg,
        });
      } finally {
        setIsLoadingAction(false);
        if (severityChanged) await revalidateData();
      }
    },
    [config, uuid, isLoadingAction, id, revalidateData],
  );

  const handleDisable = React.useCallback(async () => {
    if (!config || !uuid || isLoadingAction) return;

    /* Get Config */
    const c = config.find((v) => v.uuid === uuid);
    if (!c) return;

    /* Show Loading Toast */
    setIsLoadingAction(true);
    await showToast({
      style: Toast.Style.Animated,
      title: "Disabling Trigger",
    });

    /* Disable Trigger */
    let disabled = false;
    const client = new ZabbixClient({ url: c.url, key: c.key });
    try {
      await client.MethodTriggerUpdate({
        triggerid: id,
        status: 1,
      });
      disabled = true;
      await showToast({
        style: Toast.Style.Success,
        title: "Trigger Disabled",
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error Disabling Trigger",
        message: msg,
      });
    } finally {
      setIsLoadingAction(false);
      if (disabled) await revalidateData();
    }
  }, [config, uuid, isLoadingAction, id, revalidateData]);

  if (!config?.length || !uuid || !id || isLoading) return;
  return (
    <ActionPanel.Submenu
      title="Configure Trigger"
      icon={Icon.Gear}
      shortcut={KeyboardCustom.ConfigureTrigger}
    >
      <ActionPanel.Submenu title="Change Severity" icon={Icon.Replace}>
        <Action
          title="Not Classified"
          icon={Icon.Info}
          onAction={() => handleChangeSeverity("0")}
          key={0}
        />
        <Action
          title="Info"
          icon={Icon.Info}
          onAction={() => handleChangeSeverity("1")}
          key={1}
        />
        <Action
          title="Warning"
          icon={Icon.Warning}
          onAction={() => handleChangeSeverity("2")}
          key={2}
        />
        <Action
          title="Average"
          icon={Icon.Warning}
          onAction={() => handleChangeSeverity("3")}
          key={3}
        />
        <Action
          title="High"
          icon={Icon.XMarkCircle}
          onAction={() => handleChangeSeverity("4")}
          key={4}
        />
        <Action
          title="Disaster"
          icon={Icon.XMarkCircle}
          onAction={() => handleChangeSeverity("5")}
          key={5}
        />
      </ActionPanel.Submenu>
      <Action
        title="Disable Trigger"
        icon={Icon.BellDisabled}
        onAction={() => handleDisable()}
      />
    </ActionPanel.Submenu>
  );
}

/* ActionPanel.Submenu: "Configure Host" */
export function ActionConfigureHost({
  config,
  uuid,
  isLoading,
  revalidateData,
  value,
}: {
  config?: Types.LocalStorageZabbixServer[];
  uuid?: string;
  isLoading: boolean;
  revalidateData: () => Promise<void>;
  value?: ZabbixObjectHost;
}): React.JSX.Element | undefined {
  const [isLoadingAction, setIsLoadingAction] = React.useState(false);

  const handleToggleStatus = React.useCallback(
    async (currentStatus?: string) => {
      if (!config || !uuid || isLoadingAction || !value?.hostid) return;

      /* New Status */
      const status = currentStatus === "1" ? 0 : 1;
      const toastTitleLoading = ["Enabling Host", "Disabling Host"];
      const toastTitleSuccess = ["Host Enabled", "Host Disabled"];
      const toastTitleError = ["Error Enabling Host", "Error Disabling Host"];

      /* Get Config */
      const c = config.find((v) => v.uuid === uuid);
      if (!c) return;

      /* Show Loading Toast */
      setIsLoadingAction(true);
      await showToast({
        style: Toast.Style.Animated,
        title: toastTitleLoading.at(status)!,
      });

      /* Disable Host */
      let disabled = false;
      const client = new ZabbixClient({ url: c.url, key: c.key });
      try {
        await client.MethodHostUpdate({
          hostid: value.hostid,
          status: status,
        });
        disabled = true;
        await showToast({
          style: Toast.Style.Success,
          title: toastTitleSuccess.at(status)!,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        await showToast({
          style: Toast.Style.Failure,
          title: toastTitleError.at(status)!,
          message: msg,
        });
      } finally {
        setIsLoadingAction(false);
        if (disabled) await revalidateData();
      }
    },
    [config, uuid, isLoadingAction, value?.hostid, revalidateData],
  );

  const handleDelete = React.useCallback(async () => {
    if (!config || !uuid || isLoadingAction || !value?.hostid) return;

    /* Get Config */
    const c = config.find((v) => v.uuid === uuid);
    if (!c) return;

    /* Show Loading Toast */
    setIsLoadingAction(true);
    await showToast({
      style: Toast.Style.Animated,
      title: "Deleting Host",
    });

    /* Delete Host */
    let deleted = false;
    const client = new ZabbixClient({ url: c.url, key: c.key });
    try {
      await client.MethodHostDelete([value.hostid]);
      deleted = true;
      await showToast({
        style: Toast.Style.Success,
        title: "Host Deleted",
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error Deleting Host",
        message: msg,
      });
    } finally {
      setIsLoadingAction(false);
      if (deleted) await revalidateData();
    }
  }, [config, uuid, isLoadingAction, value?.hostid, revalidateData]);

  if (!config?.length || !uuid || !value || isLoading) return;
  return (
    <ActionPanel.Submenu
      title="Configure Host"
      icon={Icon.Gear}
      shortcut={KeyboardCustom.ConfigureHost}
    >
      <Action
        title={value.status === "1" ? "Enable Host" : "Disable Host"}
        icon={value.status === "1" ? Icon.ArrowUpCircle : Icon.CircleDisabled}
        onAction={() => handleToggleStatus(value.status)}
      />
      <ActionPanel.Submenu title="Delete Host" icon={Icon.Trash}>
        <Action
          title={`Yes, I Want to Delete Host "${value.name}"`}
          onAction={() => handleDelete()}
        />
        <Action title="No" />
      </ActionPanel.Submenu>
    </ActionPanel.Submenu>
  );
}
