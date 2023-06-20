import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useTask } from "../../hooks/task.hook";
import { SaveCommand, useCommand } from "../../hooks/command.hook";
import { Task } from "../../core/types";
import { useDetails } from "./details.component";
import { useAccessories } from "./accessories.component";
import { useActions } from "./actions.component";
import { ViewTypes } from "../../core/helpers/ui.helper";

export function Item({
  task,
  views,
  revalidate,
  toggleDetail,
  isShowingDetail,
  goToView,
  onSave,
}: {
  task: Task;
  isShowingDetail: boolean;
  toggleDetail: () => void;
  revalidate: () => void;
  views: ViewTypes;
  goToView: {
    next: () => void;
    prev: () => void;
  };
  onSave: SaveCommand;
}) {
  const item = useTask(task);
  const details = useDetails(item);
  const accessories = useAccessories(item);
  const actions = useActions({
    views,
    goToView,
    task: item,
    onSave,
    commands: useCommand(item, revalidate),
    revalidate,
  });

  return (
    <List.Item
      {...item.props.header()}
      accessories={isShowingDetail ? [] : accessories}
      actions={
        <ActionPanel>
          <Action
            key={`task_${task.uuid}_action_detail_toggle`}
            title="Toggle Detail"
            icon={Icon.Eye}
            onAction={toggleDetail}
          />
          {actions}
        </ActionPanel>
      }
      detail={isShowingDetail && details}
    />
  );
}
