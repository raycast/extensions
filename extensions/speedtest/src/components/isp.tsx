import { List } from "@raycast/api";
import { ISPInterface } from "../lib/speedtest.types";
import { ListItemMetadata } from "./list-item-metadata";
import { icons } from "../lib/speedtest-pretty-names";

type ISPListItemProps = {
  name: string;
  isp: ISPInterface;
  children: JSX.Element;
};

export function ISPListItem({ name, isp, children }: ISPListItemProps): JSX.Element {
  return (
    <List.Item
      title="Internet Service Provider"
      icon={icons.interface}
      actions={children}
      accessories={[
        {
          text: `${name || "?"}`,
        },
      ]}
      detail={isp && <ListItemMetadata data={isp} />}
    />
  );
}
