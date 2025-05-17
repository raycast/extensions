import { Grid, ActionPanel, Action, Icon, showInFinder } from "@raycast/api";
import { FoldersProvider, useFolders } from "./components/folder-context";
import { useImages } from "./hooks/use-images";
import { useState } from "react";
import { ActionAddFolder } from "./components/action-add-folder";

function SearchGrid() {
  const { folders, isLoading: foldersLoading } = useFolders();
  const { images, isLoading: imagesLoading } = useImages(folders);
  const [selectedFolder, setSelectedFolder] = useState("All");
  const [selectedExtension, setSelectedExtension] = useState("All");

  const filteredImages = images
    .filter((image) => selectedFolder === "All" || image.path.startsWith(selectedFolder))
    .filter((image) => selectedExtension === "All" || image.type === selectedExtension);

  return (
    <Grid
      columns={8}
      navigationTitle="Icons"
      searchBarPlaceholder="Search Logos..."
      inset={Grid.Inset.Large}
      isLoading={foldersLoading || imagesLoading}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select Folder"
          storeValue={true}
          onChange={(newValue) => {
            if (newValue === "All") {
              setSelectedFolder("All");
              setSelectedExtension("All");
            } else if (folders.some((folder) => folder.path === newValue)) {
              setSelectedFolder(newValue);
              setSelectedExtension("All");
            } else {
              setSelectedFolder("All");
              setSelectedExtension(newValue);
            }
          }}
        >
          <Grid.Dropdown.Section>
            <Grid.Dropdown.Item key="All" title="All Folders" value="All" />
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Folders">
            {folders.map((folder) => (
              <Grid.Dropdown.Item key={folder.path} title={folder.path} value={folder.path} />
            ))}
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Extensions">
            {Array.from(new Set(images.map((img) => img.type))).map((ext) => (
              <Grid.Dropdown.Item key={ext} title={ext} value={ext} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {filteredImages.length === 0 ? (
        <Grid.EmptyView
          icon={Icon.Folder}
          title="No Icons Found"
          description="Add folders containing your icons to get started"
          actions={
            <ActionPanel>
              <ActionAddFolder />
            </ActionPanel>
          }
        />
      ) : (
        filteredImages.map((file) => (
          <Grid.Item
            key={file.path}
            content={file.path}
            title={file.name.replace(/\.[^/.]+$/, "")}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title={`Copy ${file.type.toUpperCase()}`} content={{ file: file.path }} />
                <Action.CopyToClipboard title="Copy Path" content={file.path} />
                <Action title="Show in Finder" icon={Icon.Finder} onAction={() => showInFinder(file.path)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </Grid>
  );
}

export default function Command() {
  return (
    <FoldersProvider>
      <SearchGrid />
    </FoldersProvider>
  );
}
