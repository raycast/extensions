import {
  Action,
  ActionPanel,
  closeMainWindow,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { findPaths, getItermTarget, openInIterm } from "./macos";

export default function OpenInItermCommand() {
  const [searchText, setSearchText] = useState("");
  const [paths, setPaths] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const query = searchText.trim();
    if (query.length < 2) {
      setPaths([]);
      setError(undefined);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await findPaths(query);
        if (!cancelled) {
          setPaths(results);
          setError(undefined);
        }
      } catch (searchError) {
        if (!cancelled) {
          setPaths([]);
          setError(
            searchError instanceof Error
              ? searchError.message
              : String(searchError),
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [searchText]);

  async function openPath(path: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Opening iTerm",
    });

    try {
      await openInIterm(await getItermTarget(path));
      toast.style = Toast.Style.Success;
      toast.title = "Opened in iTerm";
      await closeMainWindow();
    } catch (openError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not open iTerm",
        message:
          openError instanceof Error ? openError.message : String(openError),
      });
    }
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not search files"
          description={error}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      searchBarPlaceholder="Search files and folders"
      throttle
    >
      {paths.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={
            searchText
              ? "No matching files or folders"
              : "Search files and folders"
          }
          description={
            searchText
              ? searchText.trim().length < 2
                ? "Enter at least two characters to search."
                : "Try a different file or folder name."
              : "Enter at least two characters to search."
          }
        />
      ) : (
        <List.Section title={`${paths.length} Results`}>
          {paths.map((path) => (
            <List.Item
              key={path}
              title={path.split("/").pop() || path}
              subtitle={path}
              icon={{ fileIcon: path }}
              actions={
                <ActionPanel>
                  <Action
                    title="Open in iTerm"
                    icon={Icon.Terminal}
                    onAction={() => openPath(path)}
                  />
                  <Action.ShowInFinder path={path} />
                  <Action.CopyToClipboard content={path} title="Copy Path" />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
