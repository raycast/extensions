import { Color, Icon, List } from "@raycast/api";
import { pingToString } from "../lib/utils";
import { ListItemMetadata } from "./list-item-metadata";
import { Ping } from "../lib/speedtest.types";

type PingListItemProps = {
  ping: number;
  fullPingData: Ping;
  children: JSX.Element;
};

export function PingListItem({ ping, fullPingData, children }: PingListItemProps): JSX.Element {
  return (
    <List.Item
      title="Ping"
      icon={{ source: Icon.LevelMeter, tintColor: Color.Blue }}
      actions={children}
      accessories={[
        {
          text: `${pingToString(ping)}`,
        },
      ]}
      detail={fullPingData && <ListItemMetadata data={fullPingData} />}
    />
  );
}
