import { List } from "@raycast/api";
import { icons } from "../lib/speedtest-pretty-names";
import { Server } from "../lib/speedtest.types";
import { ListItemMetadata } from "./list-item-metadata";

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
