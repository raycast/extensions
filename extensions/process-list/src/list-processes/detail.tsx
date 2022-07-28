import { Icon, List } from "@raycast/api";
import { FC } from "react";
import { ProcessItem } from "../types";
import { dateFormatter } from "../util/date-formatter";
import { useProcessListContext } from "./context";
import { cpuIcon, memoryIcon } from "./item";

// Available attributes:
//   priority: 4,
//   memVsz: 408236128,
//   memRss: 688,
//   nice: 0,
//   started: '2022-07-20 15:31:00',
//   state: 'sleeping',
//   tty: '',
//   user: 'root',
//   command: 'syslogd',
//   params: '',
//   path: '/usr/sbin'

export const Details: FC<{ item: ProcessItem }> = ({ item }) => {
  const { totalMemory } = useProcessListContext();

  const priorityIcon = () => {
    if (item.priority < 10) return Icon.Signal1;
    if (item.priority < 30) return Icon.Signal2;
    if (item.priority < 50) return Icon.Signal3;
    return Icon.FullSignal;
  };
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title={item.name} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="PID" text={item.pid} />
          <List.Item.Detail.Metadata.Label title="User" icon={Icon.Person} text={item.user} />
          <List.Item.Detail.Metadata.Label
            text={`${Math.ceil(item.memRss / 1000)} MB`}
            title="Memory"
            icon={memoryIcon(item, totalMemory)}
          />
          <List.Item.Detail.Metadata.Label text={`${item.cpu}%`} title="CPU" icon={cpuIcon(item)} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            icon={Icon.Clock}
            text={dateFormatter.format(new Date(item.started))}
            title="Started"
          />
          {item.path.length > 0 && <List.Item.Detail.Metadata.Label icon={Icon.Folder} text={item.path} title="Path" />}
          <List.Item.Detail.Metadata.Label text={item.state} title="State" />
          <List.Item.Detail.Metadata.Label icon={priorityIcon()} text={`${item.priority}`} title="Priority" />
        </List.Item.Detail.Metadata>
      }
    />
  );
};
