import { List, ListItem } from "@raycast/api";
import { Channel } from "../types/arena";

interface ChannelListProps {
  channels: Channel[];
  actions: (channel: Channel) => JSX.Element;
}

export const ChannelList = ({ channels, actions }: ChannelListProps) => {
  return (
    <List>
      {channels.map((chan) => (
        <ListItem
          key={chan.id}
          title={chan.title}
          subtitle={`${chan.length === 1 ? "1 block" : `${chan.length} blocks`}`}
          actions={actions(chan)}
        />
      ))}
    </List>
  );
};
