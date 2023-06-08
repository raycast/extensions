import { ActionPanel, Action, Icon } from "@raycast/api";
import CreateTaskForm from "./CreateTaskForm";
import useAria2 from "../hooks/useAria2";

type Props = {
  gid: string;
  infoHash: string;
  // onActionSuccess: () => void;
};

function TaskActions({
  gid,
  infoHash,
}: // onActionSuccess
Props) {
  const { pauseTask, removeTask, restartTask } = useAria2();

  return (
    <ActionPanel title="Actions">
      <Action.CopyToClipboard
        title="Copy Link"
        content={`magnet:?xt=urn:btih:${infoHash}`}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      <Action.Push
        icon={Icon.PlusCircle}
        title="Add Task"
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        target={<CreateTaskForm />}
      />
      <Action
        title="Restart Task"
        icon={Icon.Play}
        shortcut={{ modifiers: ["cmd"], key: "s" }}
        onAction={() => {
          restartTask(gid);
        }}
      />
      <Action
        title="Pause Task"
        icon={Icon.Pause}
        shortcut={{ modifiers: ["cmd"], key: "p" }}
        onAction={() => {
          pauseTask(gid);
        }}
      />
      <Action
        title="Remove Task"
        icon={Icon.Trash}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={() => {
          console.log("gid=>", gid);
          removeTask(gid);
        }}
      />
    </ActionPanel>
  );
}

export default TaskActions;
