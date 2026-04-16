import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  environment,
  Icon,
  List,
  openExtensionPreferences,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import {
  createShare,
  deleteSnippet,
  resolveCredentials,
  updateSnippet,
} from "./utils/api";
import { getLangLabel } from "./utils/languages";
import CreateShare from "./create-share";
import EditSnippet from "./edit-snippet";
import ManageShares from "./manage-shares";
import SnippetDetail from "./snippet-detail";
import type { ApiListResponse, Snippet } from "./types";

type Visibility = "all" | "public" | "private";

export default function ListSnippets() {
  const [visibility, setVisibility] = useState<Visibility>("all");
  const { token, baseUrl, isMissingToken } = resolveCredentials();

  const url =
    visibility === "all"
      ? `${baseUrl}/snippets`
      : `${baseUrl}/snippets?visibility=${visibility}`;

  const { isLoading, data, revalidate } = useFetch<ApiListResponse<Snippet>>(
    url,
    {
      execute: !isMissingToken,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  );

  const snippets = data?.data ?? [];

  async function handleDelete(snippet: Snippet) {
    const confirmed = await confirmAlert({
      title: "Delete Snippet",
      message: `Delete "${snippet.title ?? "Untitled"}"? This cannot be undone.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting snippet…",
    });
    try {
      await deleteSnippet(snippet.id);
      toast.style = Toast.Style.Success;
      toast.title = "Snippet deleted";
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete snippet";
      toast.message = error instanceof Error ? error.message : undefined;
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="My Snippets"
      searchBarPlaceholder="Search snippets…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by visibility"
          value={visibility}
          onChange={(v) => setVisibility(v as Visibility)}
        >
          <List.Dropdown.Item title="All Snippets" value="all" />
          <List.Dropdown.Item title="Public" value="public" />
          <List.Dropdown.Item title="Private" value="private" />
        </List.Dropdown>
      }
    >
      {isMissingToken ? (
        <List.EmptyView
          icon={Icon.Warning}
          title={
            environment.isDevelopment
              ? "Dev API Token required"
              : "API Token required"
          }
          description={
            environment.isDevelopment
              ? "Set your Dev API Token in extension preferences to get started."
              : "Set your API Token in extension preferences to get started."
          }
          actions={
            <ActionPanel>
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ) : snippets.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No snippets found"
          description="Create your first snippet with the Create Snippet command."
        />
      ) : (
        snippets.map((snippet) => (
          <SnippetListItem
            key={snippet.id}
            snippet={snippet}
            onDelete={handleDelete}
            onRevalidate={revalidate}
          />
        ))
      )}
    </List>
  );
}

function SnippetListItem({
  snippet,
  onDelete,
  onRevalidate,
}: {
  snippet: Snippet;
  onDelete: (snippet: Snippet) => void;
  onRevalidate: () => void;
}) {
  const { push } = useNavigation();
  const title = snippet.title ?? "Untitled";
  const langLabel = getLangLabel(snippet.language);

  const accessories: List.Item.Accessory[] = [];

  if (!snippet.is_public) {
    accessories.push({
      icon: { source: Icon.Lock, tintColor: Color.SecondaryText },
      tooltip: "Private",
    });
  }

  if (snippet.has_active_burner_share) {
    accessories.push({
      icon: { source: Icon.Bolt, tintColor: Color.Orange },
      tooltip: "Active burner link",
    });
  }

  if (snippet.expires_at) {
    const isExpired = new Date(snippet.expires_at) < new Date();
    accessories.push({
      icon: {
        source: Icon.Clock,
        tintColor: isExpired ? Color.Red : Color.Yellow,
      },
      tooltip: isExpired
        ? "Expired"
        : `Expires ${new Date(snippet.expires_at).toLocaleDateString()}`,
    });
  }

  if (snippet.language) {
    accessories.push({ tag: { value: langLabel, color: Color.Blue } });
  }

  async function handleToggleVisibility() {
    const next = !snippet.is_public;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: next ? "Making public…" : "Making private…",
    });
    try {
      await updateSnippet(snippet.id, { is_public: next });
      toast.style = Toast.Style.Success;
      toast.title = next ? "Now public" : "Now private";
      onRevalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update visibility";
      toast.message = error instanceof Error ? error.message : undefined;
    }
  }

  async function handleQuickLinkShare() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating link…",
    });
    try {
      const result = await createShare(snippet.id, {
        type: "link",
        access_mode: "public_link",
      });
      if (result.data.share_url) {
        await Clipboard.copy(result.data.share_url);
        toast.style = Toast.Style.Success;
        toast.title = "Share link copied";
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "Share created";
      }
      onRevalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create share";
      toast.message = error instanceof Error ? error.message : undefined;
    }
  }

  async function handleQuickBurnerShare() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating burner link…",
    });
    try {
      const result = await createShare(snippet.id, {
        type: "burner",
        access_mode: "public_link",
        max_views: 1,
      });
      if (result.data.share_url) {
        await Clipboard.copy(result.data.share_url);
        toast.style = Toast.Style.Success;
        toast.title = "Burner link copied";
        toast.message = "Self-destructs after 1 view";
      }
      onRevalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create burner link";
      toast.message = error instanceof Error ? error.message : undefined;
    }
  }

  return (
    <List.Item
      title={title}
      subtitle={snippet.content.slice(0, 80).replace(/\n/g, " ")}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="View Detail"
              icon={Icon.Eye}
              onAction={() =>
                push(
                  <SnippetDetail
                    snippet={snippet}
                    onRevalidate={onRevalidate}
                  />,
                )
              }
            />
            <Action
              title="Edit Snippet"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={() =>
                push(
                  <EditSnippet snippet={snippet} onRevalidate={onRevalidate} />,
                )
              }
            />
            <Action
              title="Copy Content"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onAction={async () => {
                await Clipboard.copy(snippet.content);
                await showHUD("Content copied to clipboard");
              }}
            />
            <Action
              title={snippet.is_public ? "Make Private" : "Make Public"}
              icon={snippet.is_public ? Icon.Lock : Icon.LockUnlocked}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              onAction={handleToggleVisibility}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Share">
            <Action
              title="Copy Link Share"
              icon={Icon.Link}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={handleQuickLinkShare}
            />
            <Action
              title="Copy Burner Link (1 View)"
              icon={Icon.Bolt}
              shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
              onAction={handleQuickBurnerShare}
            />
            <Action
              title="Share with Contacts…"
              icon={Icon.Person}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              onAction={() =>
                push(
                  <CreateShare
                    snippet={snippet}
                    type="restricted"
                    onSuccess={onRevalidate}
                  />,
                )
              }
            />
            <Action
              title="Custom Share…"
              icon={Icon.Gear}
              onAction={() =>
                push(
                  <CreateShare
                    snippet={snippet}
                    type="link"
                    onSuccess={onRevalidate}
                  />,
                )
              }
            />
            <Action
              title="Manage Shares"
              icon={Icon.List}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              onAction={() => push(<ManageShares snippet={snippet} />)}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRevalidate}
            />
            <Action
              title="Delete Snippet"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={() => onDelete(snippet)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
