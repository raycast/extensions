import {
  Alert,
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  popToRoot,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

import { readLibrary, removeImage } from "./lib/quickpic";
import type { QuickPicResolvedItem } from "./types";

export default function Command() {
  const [items, setItems] = useState<QuickPicResolvedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const libraryItems = await readLibrary();
      setItems(libraryItems);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load QuickPic library",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function handleDelete(item: QuickPicResolvedItem) {
    const confirmed = await confirmAlert({
      title: `Remove "${item.title}"?`,
      message: "The copied image file and its saved keywords will be deleted.",
      primaryAction: {
        title: "Delete Image",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      await removeImage(item.id);
      setItems((currentItems) => currentItems.filter((currentItem) => currentItem.id !== item.id));
      await showToast({
        style: Toast.Style.Success,
        title: "Image removed",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not remove image",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search by keyword or title"
      isShowingDetail={items.length > 0}
      navigationTitle="QuickPic Library"
    >
      {items.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No saved images"
          description="Use the Add Image command or import a selected Finder image to start building your library."
          icon={{ source: Icon.Image, tintColor: Color.SecondaryText }}
        />
      ) : null}

      {items.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          subtitle={item.originalName}
          keywords={item.keywords}
          icon={{ source: item.filePath, fallback: Icon.Image }}
          accessories={[{ text: item.keywords.join(", ") }, { icon: Icon.Clipboard }]}
          detail={
            <List.Item.Detail
              markdown={[
                `# ${item.title}`,
                "",
                `**Keywords:** ${item.keywords.join(", ")}`,
                `**Original file:** ${item.originalName}`,
                `**Saved:** ${new Date(item.createdAt).toLocaleString()}`,
                "",
                `![${item.title}](${encodeURI(`file://${item.filePath}`)})`,
              ].join("\n")}
            />
          }
          actions={
            <ActionPanel>
              <Action.Paste
                title="Paste File"
                content={{ file: item.filePath }}
                icon={Icon.ArrowRight}
              />
              <Action.CopyToClipboard
                title="Copy File to Clipboard"
                content={{ file: item.filePath }}
                icon={Icon.Clipboard}
              />
              <Action.ShowInFinder title="Show in Finder" path={item.filePath} icon={Icon.Finder} />
              <Action
                title="Copy Image Path"
                icon={Icon.Terminal}
                onAction={async () => {
                  await Clipboard.copy(item.filePath);
                  await showToast({ style: Toast.Style.Success, title: "Path copied" });
                }}
              />
              <Action
                title="Refresh Library"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={loadItems}
              />
              <Action
                title="Back to Root Search"
                icon={Icon.House}
                shortcut={{ modifiers: ["cmd"], key: "escape" }}
                onAction={async () => {
                  await popToRoot({ clearSearchBar: true });
                }}
              />
              <Action
                title="Delete Image"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                onAction={() => handleDelete(item)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
