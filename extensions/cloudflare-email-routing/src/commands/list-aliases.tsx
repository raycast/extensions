import { useState } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Alert,
  confirmAlert,
  Color,
  Keyboard,
  useNavigation,
} from "@raycast/api";
import { useAliases } from "../hooks/useAliases";
import { AliasDetail } from "../components/AliasDetail";
import { AliasRule } from "../types";
import { deleteRule } from "../services/cf/rules";
import CreateAlias from "./create-alias";

export default function ListAliases() {
  const { aliases, isLoading, revalidate } = useAliases();
  const [showingDetail, setShowingDetail] = useState(false);
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();

  const handleDelete = async (alias: AliasRule) => {
    const confirmed = await confirmAlert({
      title: "Delete Email Alias",
      message: alias.isManaged
        ? `Are you sure you want to delete the alias "${alias.email}"?`
        : `This alias was not created by the extension. Deleting it will remove the Cloudflare routing rule for "${alias.email}".`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await deleteRule(alias.id);
        showToast({
          style: Toast.Style.Success,
          title: "Alias Deleted",
          message: `Successfully deleted ${alias.email}`,
        });
        revalidate();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Delete Alias",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  };

  const handleToggleDetail = () => {
    setShowingDetail(!showingDetail);
  };

  const handleEdit = async (alias: AliasRule) => {
    if (!alias.isManaged) {
      const confirmed = await confirmAlert({
        title: "Edit Non-Managed Alias",
        message:
          "This alias was not created by the extension. Editing it will convert the rule name to the extension's managed format.",
        primaryAction: {
          title: "Continue",
          style: Alert.ActionStyle.Default,
        },
      });
      if (!confirmed) {
        return;
      }
    }

    push(<CreateAlias alias={alias} />);
  };

  const getColorForTag = (label: string): Color => {
    const colors = [Color.Blue, Color.Green, Color.Orange, Color.Red, Color.Purple, Color.Yellow, Color.Magenta];

    if (!label || label === "Unlabeled") {
      return Color.SecondaryText;
    }

    // Simple hash function to ensure consistent color for same label
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
      hash = label.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  };

  const filteredAliases = (aliases || []).filter((alias) => {
    const searchLower = searchText.toLowerCase();
    const searchTags = searchLower
      .split(" ")
      .filter((term) => term.startsWith("#") && term.length > 1)
      .map((tag) => tag.substring(1));
    const searchTerms = searchLower
      .split(" ")
      .filter((term) => !term.startsWith("#"))
      .join(" ");

    const emailMatch = alias.email.toLowerCase().includes(searchTerms);
    const descriptionMatch = alias.name.description?.toLowerCase().includes(searchTerms);
    const tagMatch = searchTags.every((tag) => alias.name.label?.toLowerCase().includes(tag));

    return (emailMatch || descriptionMatch) && tagMatch;
  });

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      searchBarPlaceholder="Search by email, description, or #tag"
      onSearchTextChange={setSearchText}
      actions={
        <ActionPanel>
          <Action
            title="Toggle Detail"
            icon={Icon.Sidebar}
            onAction={handleToggleDetail}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            onAction={revalidate}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {filteredAliases.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Email Aliases Found"
          description="Create your first email alias to get started"
          icon={Icon.Envelope}
        />
      ) : (
        filteredAliases.map((alias) => {
          const accessories: List.Item.Accessory[] = [
            {
              tag: {
                value: alias.name.label || "Unlabeled",
                color: getColorForTag(alias.name.label || "Unlabeled"),
              },
            },
          ];

          if (alias.createdAt) {
            accessories.push({
              text: alias.createdAt.toLocaleDateString(),
              icon: Icon.Calendar,
            });
          }

          return (
            <List.Item
              key={alias.id}
              title={alias.email}
              subtitle={alias.name.description || "No description"}
              accessories={accessories}
              icon={{
                source: Icon.Envelope,
                tintColor: alias.enabled ? Color.Green : Color.Orange,
              }}
              detail={showingDetail ? <AliasDetail alias={alias} /> : undefined}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Email Address"
                    content={alias.email}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action
                    title="Edit Alias"
                    icon={Icon.Pencil}
                    onAction={() => handleEdit(alias)}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                  />
                  <Action
                    title="Delete Alias"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDelete(alias)}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                  />
                  <Action
                    title="Toggle Detail"
                    icon={Icon.Sidebar}
                    onAction={handleToggleDetail}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Forwarding Address"
                    content={alias.forwardsToEmail}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    onAction={revalidate}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
