import { Icon, List } from "@raycast/api";
import { SprintItem } from "../../lib/sprint-types";
import { fmtHours, isStory, stateColor, stateIcon } from "../../lib/sprint-utils";
import { SprintActions } from "./SprintActions";

interface Props {
  item: SprintItem;
  onDone: () => void;
  showStateTag?: boolean;
  icon?: List.Item.Props["icon"];
  extraActions?: React.ReactNode;
  /** For stories: total completed work of their tasks. */
  completedSum?: number;
}

export function SprintListItem({ item, onDone, showStateTag = true, icon, extraActions, completedSum }: Props) {
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
      actions={<SprintActions item={item} onDone={onDone} extra={extraActions} />}
    />
  );
}
