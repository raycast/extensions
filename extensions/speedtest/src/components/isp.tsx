import { Color, Icon, List } from "@raycast/api";
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
      title="Internet Service Provider"
      icon={{ source: Icon.Globe, tintColor: Color.Green }}
      actions={children}
      accessories={[
        {
          text: `${name || "?"}`,
        },
      ]}
      detail={isp && <ListItemMetadata data={{ isp: name, ...isp }} />}
    />
  );
}
