import { Icon, List } from "@raycast/api";
import { WorkItem } from "../types";
import { fmtHours, isStory, stateColor, stateIcon } from "../utils";
import { WorkItemActions } from "./WorkItemActions";
import { WorkItemDetail } from "./WorkItemDetail";

interface Props {
  item: WorkItem;
  parent?: WorkItem;
  onDone: () => void;
  showStateTag?: boolean;
  icon?: List.Item.Props["icon"];
  extraActions?: React.ReactNode;
  /** For stories: total completed work of their tasks. */
  completedSum?: number;
}

export function WorkItemListItem({
  item,
  parent,
  onDone,
  showStateTag = true,
  icon,
  extraActions,
  completedSum,
}: Props) {
  return (
    <List.Item
      title={`${item.id}  ${item.title}`}
      icon={icon ?? stateIcon(item.state)}
      keywords={[String(item.id), item.title, item.state, item.type]}
      accessories={[
        ...(showStateTag ? [{ tag: { value: item.state, color: stateColor(item.state) } }] : []),
        ...(isStory(item.type)
          ? [
              ...(item.storyPoints !== undefined ? [{ text: `${item.storyPoints} pts`, tooltip: "Story points" }] : []),
              ...(completedSum !== undefined
                ? [{ icon: Icon.CheckCircle, text: fmtHours(completedSum), tooltip: "Completed work (all tasks)" }]
                : []),
            ]
          : [
              ...(item.estimate !== undefined
                ? [{ icon: Icon.Hourglass, text: fmtHours(item.estimate), tooltip: "Estimated work" }]
                : []),
              ...(item.completed !== undefined
                ? [{ icon: Icon.CheckCircle, text: fmtHours(item.completed), tooltip: "Completed work" }]
                : []),
            ]),
      ]}
      actions={
        <WorkItemActions
          item={item}
          onDone={onDone}
          extra={extraActions}
          detail={<WorkItemDetail item={item} parent={parent} onChange={onDone} />}
        />
      }
    />
  );
}
