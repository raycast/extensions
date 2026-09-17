import * as React from "react";
import * as Types from "@ui/types";
import * as ContextGlobal from "@ui/context";
import { Icon, List } from "@raycast/api";
import { ItemAccessory } from "./accessory";
import { ActionMenu } from "./menu";
import { DetailHosts } from "./detail";

function Item({
  value,
  selectedZabbixServer,
  actions,
}: {
  value: Types.DataHostsView;
  selectedZabbixServer?: string;
  actions: React.JSX.Element;
}): React.JSX.Element | undefined {
  if (!value.name) return;

  /* context */
  const ctxShowDetail = React.useContext(ContextGlobal.ShowDetail);

  /* Search keywords */
  const keywords = React.useMemo(() => {
    const k: (string | undefined)[] = [];

    /* Description */
    if (value.description) k.push(value.description);

    /* Tags */
    if (value.tags?.length)
      k.push(...value.tags.map((v) => `${v.tag}: ${v.value}`));

    /* Host Groups */
    if (value.hostgroups?.length)
      k.push(...value.hostgroups.map((v) => v.name));

    /* Trigger Severity */
    const severity = [
      "not classified",
      "info",
      "warning",
      "average",
      "high",
      "disaster",
    ];
    for (const [index, v] of severity.entries()) {
      if (
        value.triggers?.find(
          (v) =>
            v.status === "0" && v.value === "1" && v.priority === String(index),
        )
      )
        k.push(v);
    }

    /* Trigger Description when Enabled and in Problem state */
    if (value.triggers?.length)
      k.push(
        ...value.triggers
          .filter((v) => v.status === "0" && v.value === "1")
          .map((v) => v.description),
      );
    return k.filter((v) => v !== undefined);
  }, [value.tags, value.hostgroups]);

  const accessories = React.useMemo(() => {
    return ItemAccessory(value, selectedZabbixServer);
  }, [value.triggers, selectedZabbixServer]);

  return (
    <List.Item
      title={value.name}
      id={value.hostid}
      key={value.hostid}
      keywords={keywords}
      accessories={ctxShowDetail.value ? undefined : accessories}
      detail={<DetailHosts value={value} />}
      actions={actions}
    />
  );
}

/* List.Item */
export function ListItems({
  isLoading,
  zabbixServer,
  setZabbixServer,
  selectedZabbixServer,
  data,
}: {
  isLoading: boolean;
  zabbixServer?: Types.LocalStorageZabbixServer[];
  setZabbixServer?: (value: Types.LocalStorageZabbixServer[]) => Promise<void>;
  selectedZabbixServer?: string;
  data?: Types.DataHostsView[];
}): React.JSX.Element | undefined {
  /* Return List.Item */
  if (data && data.length)
    return (
      <React.Fragment>
        {data.map((item) => (
          <Item
            value={item}
            selectedZabbixServer={selectedZabbixServer}
            key={`${item.server_uuid}:${item.hostid}`}
            actions={
              <ActionMenu
                isLoading={isLoading}
                setZabbixServer={setZabbixServer}
                zabbixServer={zabbixServer}
                value={item}
              />
            }
          />
        ))}
      </React.Fragment>
    );

  if (!isLoading && data?.length === 0)
    return (
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No Hosts Found"
        description="No hosts are available on this server. Check your Zabbix permissions."
        actions={
          <ActionMenu
            isLoading={isLoading}
            setZabbixServer={setZabbixServer}
            zabbixServer={zabbixServer}
          />
        }
      />
    );

  /* EmptyView with Loading Message */
  return (
    <List.EmptyView
      icon={Icon.CircleProgress}
      title="Loading Data..."
      actions={<ActionMenu isLoading={isLoading} />}
    />
  );
}
