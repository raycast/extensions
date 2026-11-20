import { shortcut } from "./shortcuts";
import { Keyboard } from "@raycast/api";
import React from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast, confirmAlert, Alert, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { showFailureToast } from "@raycast/utils";
import Service, { CustomCheatsheet } from "./service";
import { ImportMarkdownFile } from "./import-markdown-file";

export default function ManageCustomCheatsheets() {
  const [customSheets, setCustomSheets] = useState<CustomCheatsheet[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();

  useEffect(() => {
    loadCustomSheets();
  }, []);

  async function loadCustomSheets() {
    try {
      setIsLoading(true);
      setLoadError(null);
      const sheets = await Service.getCustomCheatsheets();
      setCustomSheets(sheets);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Storage unavailable. Retry before making changes.");
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
      filtering={false}
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
            shortcut={Keyboard.Shortcut.Common.New}
            onAction={() => push(<CreateCustomCheatsheet onCreated={loadCustomSheets} />)}
          />
          <Action.Push
            title="Import Markdown File"
            icon={Icon.Document}
            target={<ImportMarkdownFile onImported={loadCustomSheets} />}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Overview" subtitle={`${filteredSheets.length} custom sheets`} />
      {filteredSheets.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Document}
          title={loadError ? "Storage Unavailable" : "No custom cheatsheets found"}
          description={
            loadError ||
            (searchText
              ? `No cheatsheets match "${searchText}"`
              : "Create a custom cheatsheet or import a Markdown file")
          }
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadCustomSheets} />
              <Action
                title="Create New"
                icon={Icon.Plus}
                onAction={() => push(<CreateCustomCheatsheet onCreated={loadCustomSheets} />)}
              />
              <Action.Push
                title="Import Markdown File"
                icon={Icon.Document}
                target={<ImportMarkdownFile onImported={loadCustomSheets} />}
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
            icon={Icon.Box}
            accessories={[
              { date: new Date(sheet.updatedAt) },
              ...(sheet.tags && sheet.tags.length > 0
                ? sheet.tags.slice(0, 3).map((tag) => ({ text: tag, icon: Icon.Tag }))
                : []),
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="View & Edit">
                  <Action.Push title="View Cheatsheet" icon={Icon.Window} target={<CustomSheetView sheet={sheet} />} />
                  <Action.Push
                    title="Edit Cheatsheet"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={<EditCustomSheetForm sheet={sheet} onUpdated={loadCustomSheets} />}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Actions">
                  <Action.Push
                    title="Import Markdown File"
                    icon={Icon.Document}
                    target={<ImportMarkdownFile onImported={loadCustomSheets} />}
                  />
                  <Action
                    title="Add to Favorites"
                    icon={Icon.Star}
                    shortcut={shortcut("f")}
                    onAction={async () => {
                      try {
                        await Service.addToFavorites("custom", sheet.id, sheet.title);
                        await showToast({ style: Toast.Style.Success, title: "Favorited", message: sheet.title });
                      } catch (error) {
                        await showFailureToast(error, { title: "Could Not Save Favorite" });
                      }
                    }}
                  />
                  <Action.CopyToClipboard title="Copy Title" content={sheet.title} icon={Icon.CopyClipboard} />
                  <Action.CopyToClipboard
                    title="Copy Content"
                    content={sheet.content}
                    icon={Icon.CopyClipboard}
                    shortcut={Keyboard.Shortcut.Common.Copy}
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
