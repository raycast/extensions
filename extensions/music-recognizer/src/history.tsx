import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  Keyboard,
  LaunchType,
  List,
  confirmAlert,
  launchCommand,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { clearHistory, getHistory, removeFromHistory } from "./lib/history";
import { CopyActions, OpenActions } from "./lib/track-actions";
import type { RecognizedTrack } from "./lib/types";

export default function HistoryCommand() {
  const { data: history, isLoading, revalidate } = useCachedPromise(getHistory, [], { initialData: [] });

  async function handleRemove(track: RecognizedTrack) {
    await removeFromHistory(track.id);
    await showToast({ style: Toast.Style.Success, title: "Removed from history", message: track.title });
    revalidate();
  }

  async function handleClearAll() {
    const confirmed = await confirmAlert({
      title: "Clear History?",
      message: "This removes all recognized songs. This cannot be undone.",
      primaryAction: { title: "Clear All", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await clearHistory();
    await showToast({ style: Toast.Style.Success, title: "History cleared" });
    revalidate();
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search recognized songs">
      <List.EmptyView
        icon={Icon.Music}
        title="No songs recognized yet"
        description="Play some music and run “Recognize Song”."
        actions={
          <ActionPanel>
            <Action
              title="Recognize Song"
              icon={Icon.Microphone}
              onAction={() => launchCommand({ name: "recognize", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      />
      {history.map((track) => (
        <List.Item
          key={track.id}
          icon={track.coverUrl ?? Icon.Music}
          title={track.title}
          subtitle={track.artist}
          accessories={[
            ...(track.album ? [{ text: track.album }] : []),
            { date: new Date(track.recognizedAt), tooltip: new Date(track.recognizedAt).toLocaleString() },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <OpenActions track={track} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <CopyActions track={track} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Remove from History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => handleRemove(track)}
                />
                <Action
                  title="Clear History"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.RemoveAll}
                  onAction={handleClearAll}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
