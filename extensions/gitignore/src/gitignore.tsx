import { Action, ActionPanel, clearSearchBar, Color, Icon, Keyboard, List } from "@raycast/api";
import { useEffect, useRef } from "react";
import { exportClipboard, exportPaste } from "./clipboard";
import { useAutoSelectPreference, useGitignore, useListDetailPreference } from "./hooks";
import GitignorePreview from "./preview";
import { GitignoreFile } from "./types";

function GitignoreList({
  gitignoreFiles,
  selected,
  toggleSelection,
  toggleFavorite,
  favoriteIds,
}: {
  gitignoreFiles: GitignoreFile[];
  selected: boolean | ((gitignoreFile: GitignoreFile) => boolean);
  toggleSelection: (gitignoreFile: GitignoreFile) => void;
  toggleFavorite?: (gitignoreFile: GitignoreFile) => void;
  favoriteIds?: Set<string>;
}) {
  const listDetail = useListDetailPreference();

  return (
    <>
      {gitignoreFiles.map((gitignore) => {
        const keywords = gitignore.folder !== undefined ? [gitignore.folder] : undefined;
        const isSelected = typeof selected === "function" ? selected(gitignore) : selected;
        const isFavorited = favoriteIds?.has(gitignore.id) ?? false;

        // Build accessories array
        const accessories = [];
        if (isFavorited) {
          accessories.push({ tooltip: "Favourite" });
        }
        if (gitignore.folder) {
          accessories.push({ text: gitignore.folder });
        }

        return (
          <List.Item
            key={gitignore.path}
            id={gitignore.path}
            icon={
              isSelected ? { source: Icon.Checkmark, tintColor: Color.Green } : isFavorited ? Icon.Star : Icon.Circle
            }
            title={gitignore.name}
            keywords={keywords}
            accessories={accessories.length > 0 ? accessories : undefined}
            detail={listDetail ? <GitignorePreview gitignoreFiles={[gitignore]} listPreview /> : undefined}
            actions={
              <ActionPanel>
                <Action
                  title={isSelected ? "Deselect" : "Select"}
                  icon={isSelected ? Icon.Circle : Icon.Checkmark}
                  onAction={() => {
                    toggleSelection(gitignore);
                  }}
                />
                {toggleFavorite && (
                  <Action
                    title={isFavorited ? "Remove from Favourites" : "Add to Favourites"}
                    icon={isFavorited ? Icon.StarDisabled : Icon.Star}
                    shortcut={Keyboard.Shortcut.Common.Pin}
                    onAction={() => {
                      toggleFavorite(gitignore);
                    }}
                  />
                )}
                <CopyToClipboardAction selected={[gitignore]} />
                <PasteAction selected={[gitignore]} />
                <PreviewAction selected={[gitignore]} />
              </ActionPanel>
            }
          />
        );
      })}
    </>
  );
}

export default function Gitignore() {
  const [
    { gitignoreFiles, lastUpdated, loading },
    selectedIds,
    toggleSelection,
    refresh,
    favoriteIds,
    toggleFavorite,
    selectMultiple,
  ] = useGitignore();

  const listDetail = useListDetailPreference();
  const autoSelect = useAutoSelectPreference();
  const lastFavoritesRef = useRef<Set<string>>(new Set());

  // Auto-select favorites when enabled
  useEffect(() => {
    if (autoSelect && !loading && gitignoreFiles.length > 0 && favoriteIds.size > 0) {
      // Find favorites that are not yet selected
      const favoritesToSelect = gitignoreFiles.filter((file) => favoriteIds.has(file.id) && !selectedIds.has(file.id));

      // Also check if there are new favorites that were just added
      const hasNewFavorites = Array.from(favoriteIds).some((id) => !lastFavoritesRef.current.has(id));

      // Auto-select if there are unselected favorites and either:
      // 1. We haven't processed these favorites before, or
      // 2. New favorites were just added
      if (favoritesToSelect.length > 0 && (lastFavoritesRef.current.size === 0 || hasNewFavorites)) {
        // Batch select all favorites at once to avoid state update conflicts
        selectMultiple(favoritesToSelect);
      }

      // Update the reference to track which favorites we've seen
      lastFavoritesRef.current = new Set(favoriteIds);
    } else if (loading || favoriteIds.size === 0) {
      // Reset when files are reloaded or no favorites exist
      lastFavoritesRef.current = new Set();
    }
  }, [autoSelect, loading, gitignoreFiles, favoriteIds, selectedIds, selectMultiple]);

  useEffect(() => {
    if (selectedIds.size > 0) {
      clearSearchBar({ forceScrollToTop: false });
    }
  }, [selectedIds]);

  const favorites = gitignoreFiles.filter((gitignoreFile) => favoriteIds.has(gitignoreFile.id));
  // All selected files (including favorites) for the "Create .gitignore" option
  const allSelected = gitignoreFiles.filter((gitignoreFile) => selectedIds.has(gitignoreFile.id));
  // Selected files that are not favorites (for the Selected section)
  const selected = gitignoreFiles.filter(
    (gitignoreFile) => selectedIds.has(gitignoreFile.id) && !favoriteIds.has(gitignoreFile.id),
  );
  const unselected = gitignoreFiles.filter(
    (gitignoreFile) => !selectedIds.has(gitignoreFile.id) && !favoriteIds.has(gitignoreFile.id),
  );

  const lastUpdatedSubtitle = lastUpdated != null ? `Last updated ${lastUpdated.toLocaleString()}` : "";

  return (
    <List isLoading={loading} isShowingDetail={listDetail}>
      <List.Section>
        {allSelected.length > 0 ? (
          <List.Item
            icon={Icon.Document}
            title="Create .gitignore"
            detail={listDetail ? <GitignorePreview gitignoreFiles={allSelected} listPreview /> : undefined}
            actions={
              <ActionPanel>
                <CopyToClipboardAction selected={allSelected} />
                <PasteAction selected={allSelected} />
                <PreviewAction selected={allSelected} />
              </ActionPanel>
            }
          />
        ) : (
          !loading && (
            <List.Item
              icon={Icon.Download}
              title="Refresh"
              subtitle={!listDetail ? lastUpdatedSubtitle : undefined}
              detail={listDetail && <List.Item.Detail markdown={`### ${lastUpdatedSubtitle}`} />}
              actions={
                <ActionPanel>
                  <Action title="Refresh" onAction={refresh} />
                </ActionPanel>
              }
            />
          )
        )}
      </List.Section>
      {/* Render favorites */}
      {favorites.length > 0 && (
        <List.Section title="Favourites">
          <GitignoreList
            gitignoreFiles={favorites}
            selected={(gitignore) => selectedIds.has(gitignore.id)}
            toggleSelection={toggleSelection}
            toggleFavorite={toggleFavorite}
            favoriteIds={favoriteIds}
          />
        </List.Section>
      )}
      {/* Render selected files */}
      {selected.length > 0 && (
        <List.Section title="Selected">
          <GitignoreList
            gitignoreFiles={selected}
            selected={true}
            toggleSelection={toggleSelection}
            toggleFavorite={toggleFavorite}
            favoriteIds={favoriteIds}
          />
        </List.Section>
      )}
      {/* Render unselected files */}
      {unselected.length > 0 && (
        <List.Section title="Available">
          <GitignoreList
            gitignoreFiles={unselected}
            selected={false}
            toggleSelection={toggleSelection}
            toggleFavorite={toggleFavorite}
            favoriteIds={favoriteIds}
          />
        </List.Section>
      )}
    </List>
  );
}

function PreviewAction({ selected }: { selected: GitignoreFile[] }) {
  return (
    <Action.Push
      title="Preview"
      icon={Icon.Eye}
      shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
      target={<GitignorePreview gitignoreFiles={selected} />}
    />
  );
}

function PasteAction({ selected }: { selected: GitignoreFile[] }) {
  return (
    <Action
      title="Paste to App"
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "enter" },
        windows: { modifiers: ["ctrl", "shift"], key: "enter" },
      }}
      icon={Icon.BlankDocument}
      onAction={() => exportPaste(selected)}
    />
  );
}

function CopyToClipboardAction({ selected }: { selected: GitignoreFile[] }) {
  return <Action title="Copy to Clipboard" icon={Icon.Clipboard} onAction={() => exportClipboard(selected)} />;
}
