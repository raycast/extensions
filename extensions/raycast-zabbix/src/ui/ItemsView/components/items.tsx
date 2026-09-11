import * as React from "react";
import * as Types from "@ui/types";
import * as ContextGlobal from "@ui/context";
import { ItemAccessory } from "./accessory";
import { Icon, List } from "@raycast/api";
import { ActionMenu } from "./menu";
import { DetailItems } from "./detail";

function Item({
  value,
  actions,
  showHostAccessory,
}: {
  value: Types.DataItemsView;
  actions: React.JSX.Element;
  showHostAccessory: boolean;
}): React.JSX.Element | undefined {
  if (!value.name_resolved || !value.hosts?.at(0)?.name) return;
  /* Context */
  const ctxShowDetail = React.useContext(ContextGlobal.ShowDetail);

  /* Search keywords */
  const keywords = React.useMemo(() => {
    const k: string[] = [];

    /* Host */
    if (value.hosts?.at(0)?.name) k.push(value.hosts.at(0)!.name!);

    /* Tags */
    if (value.tags?.length)
      k.push(...value.tags.map((v) => `${v.tag}: ${v.value}`));

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

    return k;
  }, [value.tags]);

  const accessories = React.useMemo(() => {
    return ItemAccessory(value, showHostAccessory);
  }, [value, showHostAccessory]);

  return (
    <List.Item
      title={value.name_resolved}
      subtitle={`${value.lastvalue} ${value.units}`}
      id={`${value.hostid}${value.itemid}`}
      key={`${value.hostid}${value.itemid}`}
      keywords={keywords}
      accessories={ctxShowDetail.value ? undefined : accessories}
      detail={<DetailItems value={value} showHostMeta={showHostAccessory} />}
      actions={actions}
    />
  );
}

/* List.Item */
export function ListItems({
  isLoading,
  data,
}: {
  isLoading: boolean;
  data?: Types.DataItemsView[];
}): React.JSX.Element | undefined {
  const showHostAccessory = React.useMemo(() => {
    if (!data?.length) return false;

    /* Find hostid different from the first item */
    const firstHostId = data.at(0)?.hostid;
    if (data.find((v) => v.hostid !== firstHostId)) return true;
    return false;
  }, [data]);

  /* Return List.Item */
  if (data && data.length)
    return (
      <React.Fragment>
        {data.map((item) => (
          <Item
            key={`${item.server_uuid}:${item.itemid}`}
            value={item}
            actions={<ActionMenu value={item} />}
            showHostAccessory={showHostAccessory}
          />
        ))}
      </React.Fragment>
    );

  if (!isLoading && data?.length === 0)
    return (
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No Items Found"
        actions={<ActionMenu />}
      />
    );

  /* EmptyView with Loading Message */
  return <List.EmptyView icon={Icon.CircleProgress} title="Loading Data..." />;
}
