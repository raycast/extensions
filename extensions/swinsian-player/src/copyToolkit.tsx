import { Detail, List, showToast, Toast, ActionPanel, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getPlayerStatus } from "./helpers/swinsian";
import { CopyList } from "./components/Toolkit";

export default function CopyToolkitCommand() {
  const { data: status, isLoading, error } = useCachedPromise(getPlayerStatus);

  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Failed to get player status", message: error.message });
  }

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (!status || !status.track) {
    return <Detail markdown="# No Track Playing\n\nStart playing a track in Swinsian to use Copy tools." />;
  }

  return (
    <List navigationTitle="Copy Toolkit">
      <List.Section title="Metadata">
        <List.Item
          icon={Icon.Clipboard}
          title="Copy Metadata"
          subtitle="Artist, Album, JSON, Markdown"
          actions={
            <ActionPanel>
              <Action.Push title="Open" target={<CopyList track={status.track} type="metadata" />} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="System Paths">
        <List.Item
          icon={Icon.Link}
          title="Copy Paths"
          subtitle="File, Folder, Artist directories"
          actions={
            <ActionPanel>
              <Action.Push title="Open" target={<CopyList track={status.track} type="paths" />} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
