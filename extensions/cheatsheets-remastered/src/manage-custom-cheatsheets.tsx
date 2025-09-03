import React from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast, confirmAlert, Alert, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import Service, { CustomCheatsheet } from "./service";

export default function ManageCustomCheatsheets() {
  const [customSheets, setCustomSheets] = useState<CustomCheatsheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();

  useEffect(() => {
    loadCustomSheets();
  }, []);

  async function loadCustomSheets() {
    try {
      setIsLoading(true);
      const sheets = await Service.getCustomCheatsheets();
      setCustomSheets(sheets);
    } catch (error) {
      showFailureToast(error, { title: "Failed to load custom cheatsheets" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteSheet(id: string, title: string) {
    const confirmed = await confirmAlert({
      title: "Delete Custom Cheatsheet",
      message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await Service.deleteCustomCheatsheet(id);
        await loadCustomSheets();

        showToast({
          style: Toast.Style.Success,
          title: "Deleted",
          message: `"${title}" has been removed`,
        });
      } catch (err) {
        showFailureToast(err, { title: "Failed to delete cheatsheet" });
      }
    }
  }

  const filteredSheets = customSheets.filter(
    (sheet) =>
      sheet.title.toLowerCase().includes(searchText.toLowerCase()) ||
      sheet.content.toLowerCase().includes(searchText.toLowerCase()) ||
      sheet.tags?.some((tag) => tag.toLowerCase().includes(searchText.toLowerCase())) ||
      sheet.description?.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search custom cheatsheets..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadCustomSheets} />
          <Action
            title="Create New"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => push(<CreateCustomCheatsheet onCreated={loadCustomSheets} />)}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Overview" subtitle={`${filteredSheets.length} custom sheets`} />
      {filteredSheets.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No custom cheatsheets found"
          description={
            searchText ? `No cheatsheets match "${searchText}"` : "Create your first custom cheatsheet to get started"
          }
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadCustomSheets} />
              <Action
                title="Create New"
                icon={Icon.Plus}
                onAction={() => push(<CreateCustomCheatsheet onCreated={loadCustomSheets} />)}
              />
            </ActionPanel>
          }
        />
      ) : (
        filteredSheets.map((sheet) => (
          <List.Item
            key={sheet.id}
            title={sheet.title}
            subtitle={sheet.description || "No description"}
            icon={Icon.Document}
            accessories={[
              { text: "Custom", icon: Icon.Tag },
              { date: new Date(sheet.updatedAt) },
              ...(sheet.tags && sheet.tags.length > 0 ? [{ text: sheet.tags.join(", "), icon: Icon.Tag }] : []),
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="View & Edit">
                  <Action.Push title="View Cheatsheet" icon={Icon.Window} target={<CustomSheetView sheet={sheet} />} />
                  <Action.Push
                    title="Edit Cheatsheet"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={<EditCustomSheetForm sheet={sheet} onUpdated={loadCustomSheets} />}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Actions">
                  <Action
                    title="Add to Favorites"
                    icon={Icon.Star}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                    onAction={async () => {
                      await Service.addToFavorites("custom", sheet.id, sheet.title);
                      showToast({
                        style: Toast.Style.Success,
                        title: "Favorited",
                        message: sheet.title,
                      });
                    }}
                  />
                  <Action.CopyToClipboard title="Copy Title" content={sheet.title} icon={Icon.CopyClipboard} />
                  <Action.CopyToClipboard
                    title="Copy Content"
                    content={sheet.content}
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Danger Zone">
                  <Action
                    title="Delete Cheatsheet"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDeleteSheet(sheet.id, sheet.title)}
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

// Import the components we need
import { CreateCustomCheatsheet } from "./create-custom-cheatsheet";
import { EditCustomSheetForm, CustomSheetView } from "./show-cheatsheets";
import { showFailureToast } from "@raycast/utils";
