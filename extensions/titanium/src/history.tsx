import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import type { HistoryEntry } from "./tools/get-video-summary";

export default function Command() {
  const {
    value: history,
    setValue: setHistory,
    isLoading,
  } = useLocalStorage<HistoryEntry[]>("history", []);

  async function removeItem(index: number) {
    const updated = (history ?? []).filter((_, i) => i !== index);
    await setHistory(updated);
    await showToast({
      style: Toast.Style.Success,
      title: "Removed from history",
    });
  }

  async function clearAll() {
    if (
      await confirmAlert({
        title: "Clear All History",
        message: "Are you sure? This cannot be undone.",
        primaryAction: {
          title: "Clear All",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      await setHistory([]);
      await showToast({ style: Toast.Style.Success, title: "History cleared" });
    }
  }

  const items = history ?? [];

  return (
    <List isLoading={isLoading} isShowingDetail={items.length > 0}>
      {items.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Video}
          title="No history yet"
          description="Mention @titanium in AI Chat with a YouTube link to get started."
        />
      ) : (
        items.map((item, index) => (
          <List.Item
            key={`${item.videoId}-${item.timestamp}`}
            icon={Icon.Video}
            title={item.title}
            subtitle={item.ownerChannelName}
            accessories={[
              { date: new Date(item.timestamp), tooltip: "Summarized at" },
            ]}
            detail={
              <List.Item.Detail
                markdown={item.thumbnail ? `![](${item.thumbnail})` : undefined}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Channel"
                      text={item.ownerChannelName}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Duration"
                      text={item.duration}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Link
                      title="Video URL"
                      target={item.video_url}
                      text="Open on YouTube"
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open in Browser"
                  url={item.video_url}
                />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={item.video_url}
                />
                <ActionPanel.Section>
                  <Action
                    icon={Icon.Trash}
                    title="Remove from History"
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => removeItem(index)}
                  />
                  <Action
                    icon={Icon.XMarkCircle}
                    title="Clear All History"
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                    onAction={clearAll}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
