import { Action, Icon } from "@raycast/api";

function PauseTaskAction(props: { onDelete: () => void }) {
  return (
    <Action
      icon={Icon.Pause}
      title="Pause Download Task"
      shortcut={{ modifiers: ["ctrl"], key: "p" }}
      onAction={props.onDelete}
    />
  );
}

export default PauseTaskAction;
