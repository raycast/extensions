import { useState } from "react";
import {
  ActionPanel,
  Action,
  Alert,
  Grid,
  Icon,
  Toast,
  confirmAlert,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { loadLibrary } from "./lib/library";
import { deleteMeme, pruneEntries, reconcileLibrary } from "./lib/ingest";
import { imageClipboardContent } from "./lib/insert";
import { Meme } from "./lib/types";
import { EditMemeForm } from "./edit-meme-form";

export default function Command() {
  const [columns, setColumns] = useState(5);
  // Single stat pass returns present memes + stale ids; pruneEntries self-heals
  // entries whose file was deleted in Finder (reuses those stats — no extra I/O).
  const {
    data: memes,
    isLoading,
    error,
    revalidate,
  } = usePromise(async () => {
    const { memes, missingIds } = loadLibrary();
    pruneEntries(missingIds);
    return memes;
  });

  async function rebuildIndex() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Rebuilding index…",
    });
    try {
      const { removed, added, total } = reconcileLibrary();
      toast.style = Toast.Style.Success;
      toast.title = "Index rebuilt";
      toast.message = `${total} images · ${removed} removed · ${added} added`;
      revalidate();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Rebuild failed";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  const rebuildAction = (
    <Action
      title="Rebuild Index"
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={rebuildIndex}
    />
  );

  async function confirmAndDelete(meme: Meme) {
    const confirmed = await confirmAlert({
      title: `Delete “${meme.name}”?`,
      message: "The image is moved to the Trash and removed from your library.",
      icon: Icon.Trash,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await deleteMeme(meme.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Deleted",
        message: meme.name,
      });
      revalidate();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't delete",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <Grid
      columns={columns}
      inset={Grid.Inset.Small}
      isLoading={isLoading}
      filtering // built-in fuzzy match across each item's title + keywords
      searchBarPlaceholder="Search by name or keyword…"
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Thumbnail Size"
          storeValue
          onChange={(value) => setColumns(parseInt(value, 10))}
        >
          <Grid.Dropdown.Item title="Large" value="3" />
          <Grid.Dropdown.Item title="Medium" value="5" />
          <Grid.Dropdown.Item title="Small" value="8" />
        </Grid.Dropdown>
      }
    >
      {error ? (
        <Grid.EmptyView
          icon={Icon.Warning}
          title="Couldn't load your library"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ) : !isLoading && memes && memes.length === 0 ? (
        <Grid.EmptyView
          icon={Icon.Image}
          title="No memes yet"
          description="Use “Add to MemeStash” to add your first image, or drop images into the library folder and rebuild the index."
          actions={<ActionPanel>{rebuildAction}</ActionPanel>}
        />
      ) : (
        memes?.map((meme) => (
          <Grid.Item
            key={meme.id}
            content={{ source: meme.path }}
            title={meme.name}
            keywords={meme.keywords}
            actions={
              <ActionPanel>
                {/* Primary: paste into the frontmost app at the cursor. */}
                <Action.Paste
                  title="Paste to Frontmost App"
                  content={imageClipboardContent(meme.path)}
                />
                {/* Fallback: leave it on the clipboard for a manual ⌘V. */}
                <Action.CopyToClipboard
                  title="Copy to Clipboard"
                  content={imageClipboardContent(meme.path)}
                />
                <Action.ShowInFinder
                  path={meme.path}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                />
                <Action.Push
                  title="Edit Details"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  target={<EditMemeForm meme={meme} onSaved={revalidate} />}
                />
                <Action
                  title="Delete from Library"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => confirmAndDelete(meme)}
                />
                {rebuildAction}
                <Action
                  title="Open Extension Preferences"
                  icon={Icon.Gear}
                  shortcut={{ modifiers: ["cmd"], key: "," }}
                  onAction={openExtensionPreferences}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </Grid>
  );
}
