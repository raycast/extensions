import { ActionPanel, Action, Icon } from "@raycast/api";
import CreateTaskForm from "./CreateTaskForm";

type Props = {
  gid: string;
  infoHash: string;
  onRemove?: () => void;
  onPause?: () => void;
  onStart?: () => void;
};

function TaskActions({ gid, infoHash, onRemove, onPause, onStart }: Props) {
  return (
    <ActionPanel title="Actions">
      <Action.CopyToClipboard
        title="Copy Link"
        content={`magnet:?xt=urn:btih:${infoHash}`}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      <Action.Push
        icon={Icon.Download}
        title="Create Task"
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        target={<CreateTaskForm />}
      />
      <Action title="Start Task" icon={Icon.Play} shortcut={{ modifiers: ["cmd"], key: "s" }} onAction={onStart} />
      <Action title="Pause Task" icon={Icon.Pause} shortcut={{ modifiers: ["cmd"], key: "p" }} onAction={onPause} />
      <Action title="Remove Task" icon={Icon.Trash} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={onRemove} />
    </ActionPanel>
  );
}

export default TaskActions;
