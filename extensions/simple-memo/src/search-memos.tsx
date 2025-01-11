import { ActionPanel, List, Action, Icon, showToast, confirmAlert } from "@raycast/api";
import { useState, useEffect } from "react";
import { MemoStorage } from "./storage/memo-storage";
import { Memo } from "./storage/types";
import CreateMemo from "./create-memo";
import EditMemo from "./edit-memo";
import { showFailureToast } from "@raycast/utils";

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [memos, setMemos] = useState<Memo[]>([]);

  useEffect(() => {
    loadMemos();
  }, []);

  async function loadMemos() {
    try {
      setIsLoading(true);
      const loadedMemos = await MemoStorage.getAllMemos();
      setMemos(loadedMemos);
    } catch (error) {
      showFailureToast(error, {
        title: "Error loading memos",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteMemo(memoId: string) {
    try {
      await MemoStorage.deleteMemo(memoId);
      setMemos((prevMemos) => prevMemos.filter((memo) => memo.id !== memoId));
      showToast({
        title: "Memo deleted successfully",
      });
    } catch (error) {
      showFailureToast(error, {
        title: "Error deleting memo",
      });
    }
  }

  async function handleDeleteAllMemos() {
    // Show confirmation alert
    if (await confirmAlert({ title: "Are you sure you want to delete all memos?" })) {
      try {
        await MemoStorage.deleteAllMemos(); // Assuming this method exists
        setMemos([]); // Clear the memos state
        showToast({
          title: "All memos deleted successfully",
        });
      } catch (error) {
        showFailureToast(error, {
          title: "Error deleting all memos",
        });
      }
    } else {
      showToast({
        title: "Deletion canceled",
      });
    }
  }

  return (
    <List isShowingDetail searchBarPlaceholder="Search Memo..." isLoading={isLoading}>
      {memos.map((memo) => (
        <List.Item
          key={memo.id}
          icon={Icon.Document}
          title={memo.title}
          accessories={[{ text: memo.content }]}
          detail={
            <List.Item.Detail
              markdown={memo.content}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Information" />
                  <List.Item.Detail.Metadata.Label title="Name" text={memo.title} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Content type" text="Text" />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Created" text={new Date(memo.createdAt).toLocaleString()} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Updated" text={new Date(memo.updatedAt).toLocaleString()} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.CopyToClipboard title="Copy to Clipboard" content={memo.content} />
              </ActionPanel.Section>

              <ActionPanel.Section>
                <Action.Push
                  title="Create Memo"
                  target={<CreateMemo />}
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
                <Action.Push
                  title="Edit Memo"
                  target={<EditMemo memo={memo} />}
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
              </ActionPanel.Section>

              <ActionPanel.Section>
                <Action
                  title="Delete Memo"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDeleteMemo(memo.id)}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                />
                <Action
                  title="Delete All Memos"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={handleDeleteAllMemos}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
