import {
  showToast,
  Toast,
  getPreferenceValues,
  showInFinder,
  open,
  List,
  Action,
  ActionPanel,
  Icon,
  Form,
  LocalStorage,
  closeMainWindow,
} from "@raycast/api";
import { homedir } from "os";
import { existsSync, lstatSync, readdirSync } from "fs";
import { resolve, join, basename, dirname } from "path";
import { useState, useEffect } from "react";
import { FileDetail } from "./FileDetail";

interface Preferences {
  defaultDirectory?: string;
  commandTitle?: string;
  showHiddenFiles?: boolean;
}

interface Arguments {
  directory?: string;
}

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  isApp: boolean;
}

function ManualPathForm({ onSubmit }: { onSubmit: (path: string) => void }) {
  async function handleSubmit(values: { path: string }) {
    if (values.path) {
      onSubmit(values.path);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Go to Directory" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="path" title="Directory Path" placeholder="Enter path (e.g., /, /usr, ~/Documents)" />
    </Form>
  );
}

export default function Command(props: { arguments: Arguments }) {
  const { arguments: args } = props;
  const preferences = getPreferenceValues<Preferences>();
  const defaultDir = preferences.defaultDirectory || homedir();

  const [items, setItems] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [showManualForm, setShowManualForm] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [hasError, setHasError] = useState(false);
  // Split view is enabled by default to show directory listing and details side by side
  const [showingDetail, setShowingDetail] = useState(true);
  // Control which item is selected - always start with current directory
  const [selectedItemId, setSelectedItemId] = useState<string>("current-directory");

  useEffect(() => {
    // Load the saved split view preference
    async function loadSplitViewPreference() {
      try {
        const savedPreference = await LocalStorage.getItem<string>("showingDetail");
        if (savedPreference !== undefined) {
          setShowingDetail(savedPreference === "true");
        }
      } catch (error) {
        console.error("Error loading split view preference:", error);
      }
    }

    loadSplitViewPreference();
    loadDirectory();
  }, []);

  async function loadDirectory(path?: string) {
    setIsLoading(true);
    setShowManualForm(false);
    setSearchText("");
    setHasError(false);

    try {
      // Use provided path or default
      const directoryPath = path || args.directory || defaultDir;

      // Resolve path (handles ~, relative paths, etc.)
      let fullPath: string;
      if (directoryPath.startsWith("~")) {
        fullPath = directoryPath.replace("~", homedir());
      } else if (directoryPath.startsWith("/")) {
        // Absolute path
        fullPath = directoryPath;
      } else {
        // Relative path - resolve from home directory instead of current working directory
        fullPath = resolve(homedir(), directoryPath);
      }

      // Check if path exists
      if (!existsSync(fullPath)) {
        setItems([]);
        setCurrentPath("");
        setHasError(true);
        setIsLoading(false);

        showToast({
          style: Toast.Style.Failure,
          title: "Directory Not Found",
          message: `${fullPath} does not exist`,
        });
        return;
      }

      // Check if it's a directory
      const stats = lstatSync(fullPath);
      if (!stats.isDirectory()) {
        setItems([]);
        setCurrentPath("");
        setHasError(true);
        setIsLoading(false);

        showToast({
          style: Toast.Style.Failure,
          title: "Not a Directory",
          message: `${fullPath} is not a directory`,
        });
        return;
      }

      // Only set currentPath if we successfully validated the directory
      setCurrentPath(fullPath);

      // Read directory contents
      const files = readdirSync(fullPath);
      const fileItems: FileItem[] = files
        .filter((file) => {
          // Filter hidden files based on preference
          if (!preferences.showHiddenFiles && file.startsWith(".")) {
            return false;
          }
          return true;
        })
        .map((file) => {
          const filePath = join(fullPath, file);
          const isDirectory = lstatSync(filePath).isDirectory();
          const isApp = isDirectory && file.toLowerCase().endsWith(".app");
          return {
            name: file,
            path: filePath,
            isDirectory,
            isApp,
          };
        })
        .sort((a, b) => {
          // Sort directories first, then files, both alphabetically
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });

      setItems(fileItems);
      setHasError(false);
      setIsLoading(false);

      // Reset selection to the "Open Current Directory in Finder" item after a short delay
      // This prevents flickering when navigating between directories
      setTimeout(() => {
        setSelectedItemId("current-directory");
      }, 100);
    } catch (error) {
      console.error("Error loading directory:", error);
      setItems([]);
      setCurrentPath("");
      setHasError(true);
      setIsLoading(false);

      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Directory",
        message: String(error),
      });
    }
  }

  function getQuickNavActions() {
    return (
      <>
        <Action
          title={showingDetail ? "Hide Details" : "Show Details"}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={async () => {
            const newValue = !showingDetail;
            setShowingDetail(newValue);
            // Save preference to LocalStorage
            await LocalStorage.setItem("showingDetail", String(newValue));
          }}
          icon={showingDetail ? Icon.EyeDisabled : Icon.Eye}
        />
        <Action
          title="Go to Path…"
          shortcut={{ modifiers: ["cmd"], key: "g" }}
          onAction={() => setShowManualForm(true)}
          icon={Icon.MagnifyingGlass}
        />
        <Action
          title="Go to Root (/)"
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => loadDirectory("/")}
          icon={Icon.HardDrive}
        />
        <Action
          title="Go to Home (~)"
          shortcut={{ modifiers: ["cmd"], key: "h" }}
          onAction={() => loadDirectory(homedir())}
          icon={Icon.House}
        />
      </>
    );
  }

  if (showManualForm) {
    return <ManualPathForm onSubmit={loadDirectory} />;
  }

  const parentDir = dirname(currentPath);
  const canGoUp = currentPath !== "/" && parentDir !== currentPath && !hasError && currentPath;

  // Filter items based on search text
  const filteredItems = items.filter((item) => item.name.toLowerCase().includes(searchText.toLowerCase()));

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search files and folders..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle={hasError ? "Error" : `Directory: ${basename(currentPath) || currentPath}`}
      isShowingDetail={showingDetail}
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => setSelectedItemId(id || "current-directory")}
      actions={<ActionPanel>{getQuickNavActions()}</ActionPanel>}
    >
      {/* Only show directory navigation if we have a valid directory */}
      {!hasError && currentPath && (
        <>
          <List.Item
            id="current-directory"
            title="Open Current Directory in Finder"
            subtitle={currentPath}
            icon={{ fileIcon: currentPath }}
            detail={<FileDetail filePath={currentPath} />}
            actions={
              <ActionPanel>
                <Action
                  title="Open in Finder"
                  onAction={async () => {
                    await showInFinder(currentPath);
                    await closeMainWindow();
                  }}
                  icon={Icon.Finder}
                />
                {getQuickNavActions()}
              </ActionPanel>
            }
          />

          {canGoUp && (
            <List.Item
              title=".."
              subtitle={`Go to ${parentDir}`}
              icon={{ fileIcon: parentDir }}
              detail={<FileDetail filePath={parentDir} />}
              actions={
                <ActionPanel>
                  <Action title="Go up" onAction={() => loadDirectory(parentDir)} icon={Icon.ArrowUp} />
                  <Action
                    title="Show in Finder"
                    onAction={async () => {
                      await showInFinder(parentDir);
                      await closeMainWindow();
                    }}
                    icon={Icon.Finder}
                  />

                  {getQuickNavActions()}
                </ActionPanel>
              }
            />
          )}
        </>
      )}

      {/* Directory Contents - only show if we have a valid directory */}
      {!hasError &&
        filteredItems.map((item) => (
          <List.Item
            key={item.path}
            id={item.path}
            title={item.name}
            subtitle={item.path}
            icon={{ fileIcon: item.path }}
            detail={<FileDetail filePath={item.path} />}
            actions={
              <ActionPanel>
                {item.isApp ? (
                  <>
                    <Action
                      title="Launch Application"
                      onAction={async () => {
                        await open(item.path);
                        await closeMainWindow();
                      }}
                      icon={Icon.Play}
                    />
                    {/* <Action
                      title="Show in Finder"
                      shortcut={{ modifiers: ["cmd"], key: "f" }}
                      onAction={async () => {
                        await showInFinder(item.path);
          
                      }}
                      icon={Icon.Finder}
                    /> */}
                    <Action title="Browse Contents" onAction={() => loadDirectory(item.path)} icon={Icon.ArrowRight} />
                  </>
                ) : item.isDirectory ? (
                  <>
                    <Action title="Open Directory" onAction={() => loadDirectory(item.path)} icon={Icon.ArrowRight} />
                    <Action
                      title="Show in Finder"
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                      onAction={async () => {
                        await showInFinder(item.path);
                        await closeMainWindow();
                      }}
                      icon={Icon.Finder}
                    />
                  </>
                ) : (
                  <>
                    <Action
                      title="Open File"
                      onAction={async () => {
                        await open(item.path);
                        await closeMainWindow();
                      }}
                      icon={Icon.Document}
                    />
                    <Action
                      title="Show in Finder"
                      onAction={async () => {
                        await showInFinder(item.path);
                        await closeMainWindow();
                      }}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                      icon={Icon.Finder}
                    />
                  </>
                )}
                {getQuickNavActions()}
              </ActionPanel>
            }
          />
        ))}

      {/* Show message when there's an error */}
      {hasError && (
        <>
          <List.Item
            title="Directory could not be loaded"
            subtitle="Use the navigation shortcuts or options below to go to a different directory"
            icon={Icon.ExclamationMark}
            detail={
              <List.Item.Detail
                markdown={`
# Error Loading Directory

The directory could not be loaded. Please try one of the following options:

- Go to your Home directory
- Go to the Root directory
- Go to Applications
- Enter a specific path manually

Or use the keyboard shortcuts:
- ⌘H - Go to Home
- ⌘R - Go to Root
- ⌘G - Enter path manually
                `.trim()}
              />
            }
            actions={<ActionPanel>{getQuickNavActions()}</ActionPanel>}
          />
          <List.Item
            title="Go To Home Directory"
            subtitle={homedir()}
            icon={{ fileIcon: homedir() }}
            detail={<FileDetail filePath={homedir()} />}
            actions={
              <ActionPanel>
                <Action title="Go to Home Directory" onAction={() => loadDirectory(homedir())} icon={Icon.House} />
                {getQuickNavActions()}
              </ActionPanel>
            }
          />
          <List.Item
            title="Go to Root Directory"
            subtitle="/"
            icon={{ fileIcon: "/" }}
            detail={<FileDetail filePath="/" />}
            actions={
              <ActionPanel>
                <Action title="Go to Root Directory" onAction={() => loadDirectory("/")} icon={Icon.HardDrive} />
                {getQuickNavActions()}
              </ActionPanel>
            }
          />
          <List.Item
            title="Go to Applications"
            subtitle="/Applications"
            icon={{ fileIcon: "/Applications" }}
            detail={<FileDetail filePath="/Applications" />}
            actions={
              <ActionPanel>
                <Action
                  title="Go to Applications"
                  onAction={() => loadDirectory("/Applications")}
                  icon={Icon.AppWindow}
                />
                {getQuickNavActions()}
              </ActionPanel>
            }
          />
        </>
      )}
    </List>
  );
}
