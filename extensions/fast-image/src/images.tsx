import { Action, ActionPanel, Grid, Icon, Keyboard, openExtensionPreferences } from "@raycast/api";
import { ImageGridItem } from "./components/ImageGridItem";
import { useImageLibrary } from "./hooks/useImageLibrary";
import { usePdfThumbnails } from "./hooks/usePdfThumbnails";
import { useSortableImages } from "./hooks/useSortableImages";
import { SORT_OPTIONS } from "./lib/sortPreference";
import { getFillGridItems } from "./preferences";
import { SortMode } from "./types";

export default function Command() {
  const { images, isLoading: isScanning, status, folder, refresh } = useImageLibrary();
  const { sorted, sortMode, setSortMode, markUsed, isLoaded: isSortLoaded } = useSortableImages(images);
  const pdfThumbnails = usePdfThumbnails(images);
  const fillGridItems = getFillGridItems();

  if (status === "missing") {
    return (
      <Grid>
        <Grid.EmptyView
          icon={Icon.Folder}
          title="No Images Folder Selected"
          description="Choose a folder in the extension preferences to start browsing your images."
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </Grid>
    );
  }

  if (status === "not-found") {
    return (
      <Grid>
        <Grid.EmptyView
          icon={Icon.ExclamationMark}
          title="Folder Not Found"
          description={`The folder "${folder}" no longer exists. Choose another one in the extension preferences.`}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </Grid>
    );
  }

  return (
    <Grid
      isLoading={isScanning || !isSortLoaded}
      fit={fillGridItems ? Grid.Fit.Fill : Grid.Fit.Contain}
      columns={6}
      searchBarPlaceholder="Search images by name..."
      searchBarAccessory={
        <Grid.Dropdown tooltip="Sort Images" value={sortMode} onChange={(value) => setSortMode(value as SortMode)}>
          {SORT_OPTIONS.map((option) => (
            <Grid.Dropdown.Item key={option.value} title={option.title} value={option.value} />
          ))}
        </Grid.Dropdown>
      }
    >
      {sorted.length === 0 && !isScanning ? (
        <Grid.EmptyView
          icon={Icon.Image}
          title="No Images Found"
          description="This folder and its subfolders don't contain any supported image files."
          actions={
            <ActionPanel>
              <Action
                title="Refresh Images List"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={refresh}
              />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        sorted.map((image) => (
          <ImageGridItem
            key={image.path}
            image={image}
            pdfThumbnail={pdfThumbnails[image.path]}
            onUse={markUsed}
            onRefresh={refresh}
          />
        ))
      )}
    </Grid>
  );
}
