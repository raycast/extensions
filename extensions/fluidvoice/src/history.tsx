import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { FluidVoiceAPI } from "./api/fluidVoice";

type Item = { id: string; timestamp: string; finalText: string; originalText: string; appName: string };
export default function Command() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  async function refresh() {
    setLoading(true);
    try {
      setItems((await FluidVoiceAPI.history()).items);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not load history",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  const actions = (
    <ActionPanel>
      <Action title="Refresh" icon={Icon.RotateClockwise} onAction={refresh} />
    </ActionPanel>
  );
  return (
    <List isLoading={loading} isShowingDetail searchBarPlaceholder="Search dictation history">
      <List.EmptyView
        title="No Dictation History"
        description="File API results may not appear in dictation history."
        actions={actions}
      />
      {items.map((item) => (
        <List.Item
          key={item.id}
          title={(item.finalText || item.originalText).slice(0, 100)}
          subtitle={item.appName}
          keywords={[item.finalText, item.originalText]}
          detail={<List.Item.Detail markdown={item.finalText || item.originalText} />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Text" content={item.finalText || item.originalText} />
              <Action title="Refresh" icon={Icon.RotateClockwise} onAction={refresh} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
