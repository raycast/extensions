import * as React from "react";
import * as Types from "@ui/types";
import * as ContextGlobal from "@ui/context";
import { Icon, List } from "@raycast/api";
import { ItemAccessory } from "./accessory";
import { ActionMenu } from "./menu";
import { DetailTriggers } from "./detail";

function Item({
  value,
  actions,
  showHostAccessory,
}: {
  value: Types.DataTriggersView;
  actions: React.JSX.Element;
  showHostAccessory: boolean;
}): React.JSX.Element | undefined {
  if (!value.description || !value.hosts?.at(0)?.name) return;
  /* Context */
  const ctxShowDetail = React.useContext(ContextGlobal.ShowDetail);

  /* Search keywords */
  const keywords = React.useMemo(() => {
    const k: string[] = [];
    if (value.hosts?.at(0)?.name) k.push(value.hosts.at(0)!.name!);
    if (value.description) k.push(value.description);
    if (value.tags?.length)
      k.push(...value.tags.map((v) => `${v.tag}: ${v.value}`));
    return k;
  }, [value]);

  const accessories = React.useMemo(() => {
    return ItemAccessory(value, showHostAccessory);
  }, [value, showHostAccessory]);

  return (
    <List.Item
      title={value.description}
      subtitle={value.hosts?.at(0)?.name}
      id={value.triggerid}
      key={value.triggerid}
      keywords={keywords}
      accessories={ctxShowDetail.value ? undefined : accessories}
      detail={<DetailTriggers value={value} showHostMeta={showHostAccessory} />}
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
  data?: Types.DataTriggersView[];
}): React.JSX.Element | undefined {
  const showHostAccessory = React.useMemo(() => {
    if (!data?.length) return false;
    const firstHostId = data.at(0)?.hosts?.at(0)?.hostid;
    if (data.find((v) => v.hosts?.at(0)?.hostid !== firstHostId)) return true;
    return false;
  }, [data]);

  /* Return List.Item */
  if (data && data.length)
    return (
      <React.Fragment>
        {data.map((item) => (
          <Item
            key={`${item.server_uuid}:${item.triggerid}`}
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
        title="No Triggers Found"
        actions={<ActionMenu />}
      />
    );

  /* EmptyView with Loading Message */
  return <List.EmptyView icon={Icon.CircleProgress} title="Loading Data..." />;
}
