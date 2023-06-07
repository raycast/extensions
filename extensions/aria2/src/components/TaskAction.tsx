import { ActionPanel, Action, Icon } from "@raycast/api";

type props = {
  infoHash: string;
  onRemove?: () => void;
  onPause?: () => void;
  onStart?: () => void;
};

function TaskAction({ infoHash, onRemove, onPause, onStart }: props) {
  return (
    <ActionPanel title="Actions">
      <Action.CopyToClipboard
        title="Copy Link"
        content={`magnet:?xt=urn:btih:${infoHash}`}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      <Action title="Start" icon={Icon.Play} shortcut={{ modifiers: ["cmd"], key: "s" }} onAction={onStart} />
      <Action title="Pause" icon={Icon.Pause} shortcut={{ modifiers: ["cmd"], key: "p" }} onAction={onPause} />
      <Action title="Remove" icon={Icon.Trash} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={onRemove} />
    </ActionPanel>
  );
}

export default TaskAction;
