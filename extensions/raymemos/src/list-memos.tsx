/**
 * List Memos Command
 * Displays a list of all memos with their content, visibility, and attachments.
 * Provides actions for editing, pinning, commenting, archiving, and deleting memos.
 */

import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Form,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getAllMemos, getRequestUrl, updateMemo, deleteMemo, createComment } from "./api";
import { MemoInfoResponse } from "./types";

/**
 * Edit Form Component
 * Provides a form interface for editing existing memos
 */
function EditForm({
  memo,
  onSave,
}: {
  memo: MemoInfoResponse;
  onSave: (content: string, visibility: "PUBLIC" | "PROTECTED" | "PRIVATE") => void;
}) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={(values) => onSave(values.content, values.visibility as "PUBLIC" | "PROTECTED" | "PRIVATE")}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="Content" defaultValue={memo.content} enableMarkdown />
      <Form.Dropdown id="visibility" title="Visibility" defaultValue={memo.visibility}>
        <Form.Dropdown.Item value="PRIVATE" title="Private" />
        <Form.Dropdown.Item value="PROTECTED" title="Protected" />
        <Form.Dropdown.Item value="PUBLIC" title="Public" />
      </Form.Dropdown>
    </Form>
  );
}

/**
 * Comment Form Component
 * Provides a form interface for adding comments to memos
 */
function CommentForm({ onSubmit }: { onSubmit: (content: string) => void }) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Comment" onSubmit={(values) => onSubmit(values.content)} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="Comment" placeholder="Enter your comment" enableMarkdown />
    </Form>
  );
}

/**
 * Main List Component
 * Displays all memos in a searchable list with detailed view and actions
 */
export default function Command() {
  const { push, pop } = useNavigation();
  const [memos, setMemos] = useState<MemoInfoResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filterList, setFilterList] = useState<MemoInfoResponse[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  async function fetchData() {
    try {
      const memosData = await getAllMemos(showArchived);
      setMemos(memosData);
      setFilterList(memosData);
    } catch (error) {
      console.error("Error fetching data:", error);
      showToast({
        title: "Error loading memos",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [showArchived]);

  useEffect(() => {
    setFilterList(memos.filter((item) => item.content.includes(searchText)));
  }, [searchText]);

  function getItemMarkdown(item: MemoInfoResponse) {
    const { content, resources } = item;
    let markdown = content;

    if (resources && resources.length > 0) {
      markdown += "\n\n**Attachments:**\n";
      resources.forEach((resource) => {
        const resourceUrl = resource.externalLink || getRequestUrl(`/o/r/${resource.uid}/${resource.filename}`);
        markdown += `\n- [${resource.filename}](${resourceUrl})`;
      });
    }

    return markdown;
  }

  async function handleTogglePin(memo: MemoInfoResponse) {
    try {
      await updateMemo(memo.name, {
        pinned: !memo.pinned,
      });
      await fetchData(); // Liste neu laden
      showToast({
        style: Toast.Style.Success,
        title: memo.pinned ? "Unpinned Memo" : "Memo pinned",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error updating pin status",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleUpdateVisibility(memo: MemoInfoResponse, newVisibility: "PUBLIC" | "PROTECTED" | "PRIVATE") {
    try {
      await updateMemo(memo.name, {
        visibility: newVisibility,
      });
      await fetchData();
      showToast({
        style: Toast.Style.Success,
        title: "Visibility updated",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error updating visibility",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleArchive(memo: MemoInfoResponse) {
    if (
      await confirmAlert({
        title: "Archive Memo?",
        message: "Do you really want to archive this memo?",
        primaryAction: {
          title: "Archive",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        await updateMemo(memo.name, {
          rowStatus: "ARCHIVED",
        });
        await fetchData();
        showToast({
          style: Toast.Style.Success,
          title: "Memo archived",
        });
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error archiving memo",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  async function handleDelete(memo: MemoInfoResponse) {
    if (
      await confirmAlert({
        title: "Delete Memo?",
        message: "Do you really want to delete this memo? This cannot be undone.",
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        await deleteMemo(memo.name);
        await fetchData();
        showToast({
          style: Toast.Style.Success,
          title: "Memo deleted",
        });
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error deleting memo",
          message: error instanceof Error ? error.message : "Unknown Error",
        });
      }
    }
  }

  async function handleEdit(memo: MemoInfoResponse) {
    const handleSave = async (content: string, visibility: "PUBLIC" | "PROTECTED" | "PRIVATE") => {
      try {
        await updateMemo(memo.name, { content, visibility });
        await fetchData();
        showToast({
          style: Toast.Style.Success,
          title: "Memo updated",
        });
        pop();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error updating memo",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };

    push(<EditForm memo={memo} onSave={handleSave} />);
  }

  async function handleAddComment(memo: MemoInfoResponse) {
    const handleSubmit = async (content: string) => {
      try {
        await createComment(memo.name, { content });
        await fetchData();
        showToast({
          style: Toast.Style.Success,
          title: "Comment added",
        });
        pop();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error adding comment",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };

    push(<CommentForm onSubmit={handleSubmit} />);
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search in Memos..."
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown
          tooltip="Status"
          value={showArchived ? "archived" : "active"}
          onChange={(value) => setShowArchived(value === "archived")}
        >
          <List.Dropdown.Item title="Active" value="active" />
          <List.Dropdown.Item title="Archived" value="archived" />
        </List.Dropdown>
      }
    >
      {filterList.map((memo) => (
        <List.Item
          key={memo.uid}
          title={memo.content.split("\n")[0] || "Empty Memo"}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser url={getRequestUrl(`/m/${memo.uid}`)} />
                <Action.CopyToClipboard content={memo.content} />
                <Action
                  title="Edit"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                  onAction={() => handleEdit(memo)}
                />
                <Action
                  title={memo.pinned ? "Do Not Pin" : "Pin"}
                  icon={Icon.Pin}
                  onAction={() => handleTogglePin(memo)}
                />

                <Action
                  title="Add Comment"
                  icon={Icon.Bubble}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
                  onAction={() => handleAddComment(memo)}
                />
              </ActionPanel.Section>

              <ActionPanel.Section>
                <Action
                  title="Mark as Private"
                  icon={Icon.Eye}
                  onAction={() => handleUpdateVisibility(memo, "PRIVATE")}
                />
                <Action
                  title="Mark as Protected"
                  icon={Icon.Eye}
                  onAction={() => handleUpdateVisibility(memo, "PROTECTED")}
                />
                <Action
                  title="Mark as Public"
                  icon={Icon.Eye}
                  onAction={() => handleUpdateVisibility(memo, "PUBLIC")}
                />
              </ActionPanel.Section>

              <ActionPanel.Section>
                <Action
                  title="Archive"
                  icon={Icon.Box}
                  style={Action.Style.Destructive}
                  onAction={() => handleArchive(memo)}
                  shortcut={{ modifiers: ["opt"], key: "a" }}
                />
                <Action
                  title="Löschen"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handleDelete(memo)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              markdown={getItemMarkdown(memo)}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Status" text={memo.rowStatus} />
                  <List.Item.Detail.Metadata.Label title="Visibility" text={memo.visibility} />
                  {memo.pinned && <List.Item.Detail.Metadata.Label title="Pinned" text="Yes" />}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
