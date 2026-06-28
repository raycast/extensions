import { Action, ActionPanel, List, Icon, showToast, Toast } from "@raycast/api";
import { useLibraryHistory, useCurrentLibrary } from "./utils/query";
import { switchLibrary, getLibraryIcon } from "./utils/api";
import { checkEagleInstallation } from "./utils/checkInstall";
import { showEagleNotOpenToast } from "./utils/error";

export default function Library() {
  const { isLoading, data: libraries = [], error, revalidate } = useLibraryHistory();
  const { data: currentLibrary, revalidate: revalidateCurrentLibrary } = useCurrentLibrary();

  checkEagleInstallation();

  if (error && "code" in error && error.code === "ECONNREFUSED") {
    showEagleNotOpenToast();
  } else if (error) {
    console.error(error);
  }

  const handleSwitchLibrary = async (libraryPath: string, libraryName: string) => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Switching library...",
      });

      await switchLibrary(libraryPath);

      // Wait for Eagle to complete the library switch
      // Eagle needs time to close the old library and open the new one
      await new Promise((resolve) => setTimeout(resolve, 2000));

      await showToast({
        style: Toast.Style.Success,
        title: "Library switched",
        message: libraryName,
      });

      // Revalidate to refresh both library history and current library indicator
      revalidate();
      revalidateCurrentLibrary();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to switch library",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Normalize path by removing trailing slash for comparison
  const normalizePath = (path: string) => path.replace(/\/$/, "");

  return (
    <List isLoading={isLoading}>
      {libraries.map((library) => {
        const isActive = currentLibrary && normalizePath(currentLibrary.path) === normalizePath(library.path);

        return (
          <List.Item
            key={library.path}
            title={library.name}
            subtitle={library.path}
            icon={{ source: getLibraryIcon(library.path), fallback: Icon.Folder }}
            accessories={isActive ? [{ icon: Icon.CheckCircle, tooltip: "Active Library" }] : []}
            actions={
              <ActionPanel>
                <Action
                  title="Switch to This Library"
                  icon={Icon.Switch}
                  onAction={() => handleSwitchLibrary(library.path, library.name)}
                />
                <Action.ShowInFinder path={library.path} />
                <Action.CopyToClipboard
                  title="Copy Library Path"
                  content={library.path}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
