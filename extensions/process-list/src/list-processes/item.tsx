import { Icon, List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { FC } from "react";
import { ProcessItem } from "../types";
import { Actions } from "./actions";
import { useProcessListContext } from "./context";
import { Details } from "./detail";

export const memoryIcon = (item: ProcessItem, totalMemory: number) =>
  getProgressIcon(item.memRss / totalMemory, "#4089EB");
export const cpuIcon = (item: ProcessItem) => getProgressIcon(item.cpu / 100);

const accessories = (processItem: ProcessItem, totalMemory: number) => [
  { icon: Icon.Person, text: processItem.user, tooltip: "User" },
  {
    icon: memoryIcon(processItem, totalMemory),
    text: `${Math.ceil(processItem.memRss / 1000)} MB`,
    tooltip: "Memory",
  },
  {
    icon: cpuIcon(processItem),
    text: `${processItem.cpu}%`,
    tooltip: "CPU",
  },
];

export const ProcessListItem: FC<{
  processItem: ProcessItem;
  index: string;
}> = ({ processItem, index }) => {
  const { showDetail, totalMemory } = useProcessListContext();

  return (
    <List.Item
      id={index}
      keywords={[processItem.user, processItem.pid]}
      title={processItem.name}
      subtitle={{ value: processItem.pid, tooltip: "PID" }}
      accessories={showDetail ? null : accessories(processItem, totalMemory)}
      actions={<Actions processItem={processItem} />}
      detail={<Details item={processItem} />}
    />
  );
};
