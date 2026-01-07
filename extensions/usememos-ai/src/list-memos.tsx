import {
  List,
  Detail,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { getUsememosClient, Memo } from "./api/usememos";

export default function ListMemos() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pinned" | "archived">("all");
  const [searchText, setSearchText] = useState("");

  const fetchMemos = useCallback(async () => {
    setIsLoading(true);
    try {
      const client = getUsememosClient();

      // Don't pass filter for 'all' - just fetch all memos
      const options: { pageSize: number; filter?: string } = { pageSize: 100 };

      // Only add filter for specific cases if the API supports it
      // For now, we'll filter client-side to avoid API compatibility issues

      const result = await client.listMemos(options);
      let fetchedMemos = result.memos || [];

      // Client-side filtering
      if (filter === "pinned") {
        fetchedMemos = fetchedMemos.filter(
          (m) => m.pinned && m.rowStatus !== "ARCHIVED",
        );
      } else if (filter === "archived") {
        fetchedMemos = fetchedMemos.filter((m) => m.rowStatus === "ARCHIVED");
      } else {
        fetchedMemos = fetchedMemos.filter((m) => m.rowStatus !== "ARCHIVED");
      }

      setMemos(fetchedMemos);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch memos",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchMemos();
  }, [fetchMemos]);

  const filteredMemos = memos.filter((memo) =>
    searchText
      ? memo.content.toLowerCase().includes(searchText.toLowerCase())
      : true,
  );

  const handlePin = async (memo: Memo) => {
    try {
      const client = getUsememosClient();
      if (memo.pinned) {
        await client.unpinMemo(memo.name);
        showToast({ style: Toast.Style.Success, title: "Memo unpinned" });
      } else {
        await client.pinMemo(memo.name);
        showToast({ style: Toast.Style.Success, title: "Memo pinned" });
      }
      fetchMemos();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update memo",
        message: String(error),
      });
    }
  };

  const handleArchive = async (memo: Memo) => {
    try {
      const client = getUsememosClient();
      if (memo.rowStatus === "ARCHIVED") {
        await client.unarchiveMemo(memo.name);
        showToast({ style: Toast.Style.Success, title: "Memo restored" });
      } else {
        await client.archiveMemo(memo.name);
        showToast({ style: Toast.Style.Success, title: "Memo archived" });
      }
      fetchMemos();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update memo",
        message: String(error),
      });
    }
  };

  const handleDelete = async (memo: Memo) => {
    const confirmed = await confirmAlert({
      title: "Delete Memo",
      message: "Are you sure you want to delete this memo?",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        const client = getUsememosClient();
        await client.deleteMemo(memo.name);
        showToast({ style: Toast.Style.Success, title: "Memo deleted" });
        fetchMemos();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete memo",
          message: String(error),
        });
      }
    }
  };

  const getPreviewText = (content: string): string => {
    const lines = content.split("\n").filter((line) => line.trim());
    return lines[0]?.slice(0, 100) || "Empty memo";
  };

  const getAccessoryItems = (memo: Memo) => {
    const items: List.Item.Accessory[] = [];

    if (memo.pinned) {
      items.push({ icon: { source: Icon.Pin, tintColor: Color.Yellow } });
    }

    if (memo.visibility !== "PRIVATE") {
      items.push({
        icon: {
          source: memo.visibility === "PUBLIC" ? Icon.Globe : Icon.Building,
          tintColor: Color.Blue,
        },
        tooltip: memo.visibility,
      });
    }

    items.push({
      date: new Date(memo.updateTime),
      tooltip: `Updated: ${new Date(memo.updateTime).toLocaleString()}`,
    });

    return items;
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Filter memos..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter"
          value={filter}
          onChange={(value) => setFilter(value as typeof filter)}
        >
          <List.Dropdown.Item title="All Memos" value="all" />
          <List.Dropdown.Item title="Pinned" value="pinned" />
          <List.Dropdown.Item title="Archived" value="archived" />
        </List.Dropdown>
      }
    >
      {filteredMemos.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No memos found"
          description={
            filter === "all" ? "Create your first memo!" : `No ${filter} memos`
          }
        />
      ) : (
        filteredMemos.map((memo) => (
          <List.Item
            key={memo.name}
            icon={
              memo.rowStatus === "ARCHIVED"
                ? { source: Icon.Tray, tintColor: Color.SecondaryText }
                : Icon.Document
            }
            title={getPreviewText(memo.content)}
            subtitle={memo.tags?.map((t) => `#${t}`).join(" ")}
            accessories={getAccessoryItems(memo)}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="View Memo"
                    icon={Icon.Eye}
                    target={<MemoDetail memo={memo} />}
                  />
                  <Action.CopyToClipboard
                    title="Copy Content"
                    content={memo.content}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.OpenInBrowser
                    title="Open in Browser"
                    url={getUsememosClient().getWebUrl(memo)}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title={memo.pinned ? "Unpin" : "Pin"}
                    icon={Icon.Pin}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                    onAction={() => handlePin(memo)}
                  />
                  <Action
                    title={
                      memo.rowStatus === "ARCHIVED" ? "Restore" : "Archive"
                    }
                    icon={Icon.Tray}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                    onAction={() => handleArchive(memo)}
                  />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => handleDelete(memo)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={fetchMemos}
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

function MemoDetail({ memo }: { memo: Memo }) {
  return (
    <Detail
      markdown={memo.content}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Created"
            text={new Date(memo.createTime).toLocaleString()}
          />
          <Detail.Metadata.Label
            title="Updated"
            text={new Date(memo.updateTime).toLocaleString()}
          />
          <Detail.Metadata.Label title="Visibility" text={memo.visibility} />
          {memo.tags && memo.tags.length > 0 && (
            <Detail.Metadata.TagList title="Tags">
              {memo.tags.map((tag) => (
                <Detail.Metadata.TagList.Item
                  key={tag}
                  text={`#${tag}`}
                  color={Color.Blue}
                />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Content" content={memo.content} />
          <Action.OpenInBrowser
            title="Open in Browser"
            url={getUsememosClient().getWebUrl(memo)}
          />
        </ActionPanel>
      }
    />
  );
}
