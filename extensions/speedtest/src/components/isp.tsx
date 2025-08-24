import { List } from "@raycast/api";
import { icons } from "../lib/speedtest-pretty-names";
import { ISPInterface } from "../lib/speedtest.types";
import { ListItemMetadata } from "./list-item-metadata";

type ISPListItemProps = {
  name: string;
  isp: ISPInterface;
  children: JSX.Element;
};

export function ISPListItem({ name, isp, children }: ISPListItemProps): JSX.Element {
  return (
    <List.Item
      title="ISP"
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
