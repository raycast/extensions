import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  confirmAlert,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { deleteShortUrl, deleteText, deleteFile } from "./lib/api";
import { getHistory, removeHistoryItem, HistoryItem } from "./lib/history";

function buildDetailMarkdown(item: HistoryItem): string {
  if (item.type === "file")
    return `![${item.title}](${item.fileUrl || item.url})`;
  if (item.type === "url")
    return `## Short URL\n\n**Target**: ${item.title}\n\n**Short URL**: [${item.url}](${item.url})`;
  if (item.type === "text")
    return `## Text Share\n\n**Content Preview**:\n\n${item.title}`;
  return "";
}

function ManageHistoryCommand() {
  const { data: history, isLoading, revalidate } = usePromise(getHistory);

  const urlItems = history?.filter((item) => item.type === "url") ?? [];
  const textItems = history?.filter((item) => item.type === "text") ?? [];
  const fileItems = history?.filter((item) => item.type === "file") ?? [];

  async function handleDelete(item: HistoryItem) {
    if (
      await confirmAlert({
        title: "Delete from S.EE",
        message: `This will delete "${item.title}" from S.EE and remove it from history.`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Deleting...",
      });
      try {
        if (item.type === "url") {
          await deleteShortUrl({ domain: item.domain, slug: item.slug });
        } else if (item.type === "text") {
          await deleteText({ domain: item.domain, slug: item.slug });
        } else if (item.type === "file" && item.hash) {
          await deleteFile(item.hash);
        }
        await removeHistoryItem(item.url, item.createdAt);
        revalidate();
        toast.style = Toast.Style.Success;
        toast.title = "Deleted from S.EE";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to delete";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    }
  }

  async function handleRemoveFromHistory(item: HistoryItem) {
    await removeHistoryItem(item.url, item.createdAt);
    revalidate();
    await showToast({
      style: Toast.Style.Success,
      title: "Removed from history",
    });
  }

  function renderItem(item: HistoryItem) {
    const icon =
      item.type === "url"
        ? { source: Icon.Link, tintColor: Color.Blue }
        : item.type === "text"
          ? { source: Icon.Text, tintColor: Color.Green }
          : { source: Icon.Document, tintColor: Color.Orange };

    const typeLabel =
      item.type === "url" ? "URL" : item.type === "text" ? "Text" : "File";

    return (
      <List.Item
        key={item.url + item.createdAt}
        icon={icon}
        title={item.title}
        accessories={[{ tag: { value: typeLabel, color: icon.tintColor } }]}
        detail={
          <List.Item.Detail
            markdown={buildDetailMarkdown(item)}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Link
                  title="URL"
                  target={item.url}
                  text={item.url}
                />
                <List.Item.Detail.Metadata.Label
                  title="Domain"
                  text={item.domain}
                />
                <List.Item.Detail.Metadata.Label
                  title="Slug"
                  text={item.slug}
                />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Created"
                  text={new Date(item.createdAt).toLocaleString()}
                />
                {item.hash ? (
                  <List.Item.Detail.Metadata.Label
                    title="Hash"
                    text={item.hash}
                  />
                ) : null}
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.CopyToClipboard title="Copy URL" content={item.url} />
              <Action.OpenInBrowser url={item.url} />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                // eslint-disable-next-line @raycast/prefer-title-case
                title="Delete from S.EE"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => handleDelete(item)}
              />
              <Action
                title="Remove from History"
                icon={Icon.XMarkCircle}
                shortcut={{ modifiers: ["ctrl"], key: "backspace" }}
                onAction={() => handleRemoveFromHistory(item)}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search history..."
    >
      {urlItems.length > 0 && (
        <List.Section title="Short URLs" subtitle={`${urlItems.length}`}>
          {urlItems.map(renderItem)}
        </List.Section>
      )}
      {textItems.length > 0 && (
        <List.Section title="Text Shares" subtitle={`${textItems.length}`}>
          {textItems.map(renderItem)}
        </List.Section>
      )}
      {fileItems.length > 0 && (
        <List.Section title="File Uploads" subtitle={`${fileItems.length}`}>
          {fileItems.map(renderItem)}
        </List.Section>
      )}
      {!isLoading && history?.length === 0 && (
        <List.EmptyView
          icon={Icon.Clock}
          title="No History"
          description="Items you share will appear here."
        />
      )}
    </List>
  );
}

export default function ManageHistory() {
  return <ManageHistoryCommand />;
}
