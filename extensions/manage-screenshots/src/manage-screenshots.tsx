import { Action, ActionPanel, Grid, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { deleteFile, formatBytes, getScreenshots, getScreenshotsDirectory, ScreenshotFile } from "./utils";

export default function Command() {
  const [view, setView] = useCachedState<"list" | "grid">("view", "grid");
  const [columns, setColumns] = useCachedState<number>("columns", 5);
  const currentDirectory = getScreenshotsDirectory();

  const {
    data: files,
    isLoading,
    revalidate,
  } = usePromise(
    async (dir) => {
      return getScreenshots(dir);
    },
    [currentDirectory],
  );

  const handleDelete = async (file: ScreenshotFile) => {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Deleting file..." });
      await deleteFile(file.path);
      await showToast({ style: Toast.Style.Success, title: "File deleted" });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete file",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const getActions = (file: ScreenshotFile) => (
    <Actions
      file={file}
      view={view}
      columns={columns}
      onToggleView={() => setView(view === "list" ? "grid" : "list")}
      onDelete={() => handleDelete(file)}
      onSetColumns={setColumns}
      onReload={revalidate}
    />
  );

  if (view === "list") {
    return (
      <List isLoading={isLoading} searchBarPlaceholder="Search screenshots...">
        <List.EmptyView icon={Icon.Image} title="No screenshots found" description={`Looking in ${currentDirectory}`} />
        {files?.map((file) => (
          <List.Item
            key={file.path}
            icon={{ source: file.path }}
            title={file.name}
            subtitle={formatBytes(file.size)}
            accessories={[{ date: file.date, tooltip: file.date.toLocaleString() }]}
            actions={getActions(file)}
          />
        ))}
      </List>
    );
  }

  return (
    <Grid isLoading={isLoading} searchBarPlaceholder="Search screenshots..." columns={columns}>
      <Grid.EmptyView icon={Icon.Image} title="No screenshots found" description={`Looking in ${currentDirectory}`} />
      {files?.map((file) => (
        <Grid.Item
          key={file.path}
          content={{ source: file.path }}
          title={file.name}
          subtitle={formatBytes(file.size)}
          actions={getActions(file)}
        />
      ))}
    </Grid>
  );
}

function Actions({
  file,
  view,
  columns,
  onToggleView,
  onDelete,
  onSetColumns,
  onReload,
}: {
  file: ScreenshotFile;
  view: "list" | "grid";
  columns: number;
  onToggleView: () => void;
  onDelete: () => void;
  onSetColumns: (columns: number) => void;
  onReload: () => void;
}) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.Open title="Open" target={file.path} />
        <Action.OpenWith path={file.path} shortcut={{ modifiers: ["ctrl"], key: "enter" }} />
        <Action.ShowInFinder path={file.path} shortcut={{ modifiers: ["ctrl", "shift"], key: "e" }} />
        <Action.CopyToClipboard
          content={{ file: file.path }}
          title="Copy to Clipboard"
          shortcut={{ modifiers: ["ctrl"], key: "c" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title={view === "list" ? "Switch to Grid View" : "Switch to List View"}
          icon={view === "list" ? Icon.AppWindowGrid3x3 : Icon.List}
          onAction={onToggleView}
          shortcut={{ modifiers: ["ctrl"], key: "v" }}
        />
        {view === "grid" && (
          <ActionPanel.Submenu
            icon={Icon.AppWindowGrid3x3}
            title="Set Grid Columns"
            shortcut={{ modifiers: ["ctrl"], key: "g" }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((col) => (
              <Action
                key={col}
                title={`${col} Column${col > 1 ? "s" : ""}`}
                icon={col === columns ? Icon.CheckCircle : undefined}
                onAction={() => onSetColumns(col)}
              />
            ))}
          </ActionPanel.Submenu>
        )}
        <Action
          title="Reload Screenshots"
          icon={Icon.ArrowClockwise}
          onAction={onReload}
          shortcut={{ modifiers: ["ctrl"], key: "r" }}
        />
        <Action
          title="Delete File"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={onDelete}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
