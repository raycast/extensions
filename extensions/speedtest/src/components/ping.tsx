import { List } from "@raycast/api";
import { icons } from "../lib/speedtest-pretty-names";
import { Ping } from "../lib/speedtest.types";
import { pingToString } from "../lib/utils";
import { ListItemMetadata } from "./list-item-metadata";

type PingListItemProps = {
  ping: number;
  fullPingData: Ping;
  children: JSX.Element;
};

export function PingListItem({ ping, fullPingData, children }: PingListItemProps): JSX.Element {
  return (
    <List.Item
      title="Ping"
      icon={icons.ping}
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
