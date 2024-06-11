import { List } from "@raycast/api";
import { ListItemMetadata } from "./list-item-metadata";
import { Server } from "../lib/speedtest.types";
import { icons } from "../lib/speedtest-pretty-names";

type ServerListItemProps = {
  serverName: string;
  server: Server;
  children: JSX.Element;
};

export function ServerListItem({ children, serverName, server }: ServerListItemProps): JSX.Element {
  return (
    <List.Item
      title="Server"
      icon={icons.server}
      actions={children}
      accessories={[
        {
          text: `${serverName ? serverName : "?"}`,
        },
      ]}
      detail={server && <ListItemMetadata data={server} />}
    />
  );
}
