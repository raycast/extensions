import { List, ActionPanel, Action, showToast, Toast, Clipboard, useNavigation, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { fetchToken, fetchData, fetchFileDetails, searchFiles } from "../utils/api";
import { makeUnique, DownloadCMD } from "../utils/helpers";
import { DownloadForm, displayFileSize } from "./DownloadForm";
import { HOST, CMD } from "../preferences";
import { AlistItem } from "../utils/types";

export default function Command() {
  const [items, setItems] = useState<AlistItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<AlistItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [onlyFiles, setOnlyFiles] = useState(false);
  const [pathStack, setPathStack] = useState<string[]>(["/"]); // Initialize path stack with root
  const { push } = useNavigation();

  useEffect(() => {
    const initTokenAndData = async () => {
      try {
        const fetchedToken = await fetchToken();
        setToken(fetchedToken);
        const data = await fetchData(fetchedToken, pathStack[pathStack.length - 1]);
        setItems(data);
        applyFilter(data, onlyFiles);
      } catch (error) {
        console.error("Error initializing data:", error);
        showToast(Toast.Style.Failure, "Failed to authenticate and fetch data", String(error));
      } finally {
        setLoading(false);
      }
    };

    initTokenAndData();
  }, [pathStack]);

  useEffect(() => {
    applyFilter(items, onlyFiles);
  }, [onlyFiles, items]);

  const applyFilter = (data: AlistItem[], filterFiles: boolean) => {
    const filtered = filterFiles ? data.filter((item) => !item.is_dir) : data;
    setFilteredItems(makeUnique(filtered));
  };

  const fetchDownloadLink = async (item: AlistItem) => {
    if (item.parent) {
      const fileDetails = await fetchFileDetails(token!, `${item.parent}/${item.name}`);
      return `${HOST}/d/${encodeURIComponent(item.name)}?sign=${fileDetails.sign}`;
    } else {
      const currentPath = pathStack[pathStack.length - 1];
      const fileDetails = await fetchFileDetails(token!, `${currentPath}/${item.name}`);
      return `${HOST}/d/${encodeURIComponent(item.name)}?sign=${fileDetails.sign}`;
    }
  };

  const handleDownloadLinkCopy = async (item: AlistItem) => {
    try {
      const downloadLink = await fetchDownloadLink(item);
      await Clipboard.copy(downloadLink);
      showToast(Toast.Style.Success, "Download link copied to clipboard");
    } catch (error) {
      console.error("Error copying download link:", error);
      showToast(Toast.Style.Failure, "Failed to copy download link", String(error));
    }
  };

  const handleCopyDownloadCommand = async (item: AlistItem) => {
    try {
      const downloadLink = await fetchDownloadLink(item);
      const Command = new DownloadCMD(CMD, downloadLink, item.name);
      await Clipboard.copy(Command.command);
      showToast(Toast.Style.Success, "Curl command copied to clipboard");
    } catch (error) {
      console.error("Error copying curl command:", error);
      showToast(Toast.Style.Failure, "Failed to copy curl command", String(error));
    }
  };

  const handleDownloadFile = (item: AlistItem) => {
    const currentPath = pathStack[pathStack.length - 1];
    push(<DownloadForm item={item} token={token!} path={currentPath} />);
  };

  const handleNavigateToDirectory = async (newPath: string) => {
    setLoading(true);
    try {
      const data = await fetchData(token!, newPath);
      setPathStack((prevStack) => [...prevStack, newPath]);
      setItems(data);
      applyFilter(data, onlyFiles);
      setSearchText("");
    } catch (error) {
      console.error("Error fetching data:", error);
      showToast(Toast.Style.Failure, "Failed to fetch items", String(error));
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateBack = () => {
    setLoading(true);
    try {
      setPathStack((prevStack) => {
        const newStack = prevStack.slice(0, -1); // Remove the last element
        const newPath = newStack[newStack.length - 1];
        fetchItemsForPath(newPath);
        return newStack;
      });
    } catch (error) {
      console.error("Error navigating back:", error);
      showToast(Toast.Style.Failure, "Failed to navigate back", String(error));
    } finally {
      setLoading(false);
    }
  };

  const fetchItemsForPath = async (path: string) => {
    try {
      const data = await fetchData(token!, path);
      setItems(data);
      applyFilter(data, onlyFiles);
    } catch (error) {
      console.error("Error fetching items for path:", error);
      showToast(Toast.Style.Failure, "Failed to fetch items for path", String(error));
    }
  };

  const toggleOnlyFiles = () => {
    setOnlyFiles((prev) => !prev);
  };

  const handleOrderItemsBySize = (ascending: boolean) => {
    const sortedItems = [...filteredItems].sort((a, b) => {
      if (a.is_dir && !b.is_dir) {
        return ascending ? 1 : -1;
      }
      if (!a.is_dir && b.is_dir) {
        return ascending ? -1 : 1;
      }
      return ascending ? a.size - b.size : b.size - a.size;
    });
    setFilteredItems(sortedItems);
  };

  const handleSearch = async (text: string) => {
    setSearchText(text);
    if (text === "") {
      applyFilter(items, onlyFiles);
    } else {
      const searchedItems = await searchFiles(token!, text, pathStack[pathStack.length - 1]);
      applyFilter(searchedItems, onlyFiles);
    }
  };

  return (
    <List isLoading={loading} searchText={searchText} onSearchTextChange={handleSearch}>
      {filteredItems.map((item) => (
        <List.Item
          key={item.hash}
          title={item.name}
          accessories={[{ text: item.is_dir ? "Directory" : displayFileSize(item) }]}
          actions={
            <ActionPanel>
              {!item.is_dir && <Action title="Download File" onAction={() => handleDownloadFile(item)} />}
              {item.is_dir && (
                <Action
                  title="Open Directory"
                  onAction={() => handleNavigateToDirectory(`${pathStack[pathStack.length - 1]}/${item.name}`)}
                  icon={{ source: Icon.Folder }}
                />
              )}
              <Action
                title="Copy Download Link"
                onAction={() => handleDownloadLinkCopy(item)}
                icon={{ source: Icon.Link }}
              />
              <Action
                title="Copy Download Command"
                onAction={() => handleCopyDownloadCommand(item)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                icon={{ source: Icon.Code }}
              />
              {pathStack.length > 1 && (
                <Action
                  title="Go Back"
                  onAction={handleNavigateBack}
                  shortcut={{ modifiers: ["shift"], key: "enter" }}
                  icon={{ source: Icon.ArrowLeft }}
                />
              )}
              <Action
                title="Show Only Files"
                onAction={toggleOnlyFiles}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                icon={{ source: Icon.Filter }}
              />
              <Action
                title="Refresh"
                onAction={() => fetchItemsForPath(pathStack[pathStack.length - 1])}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                icon={{ source: Icon.Redo }}
              />
              <Action.OpenInBrowser url={HOST} shortcut={{ modifiers: ["cmd"], key: "o" }} />
              <Action
                title="Order by Size Ascending"
                onAction={() => handleOrderItemsBySize(true)}
                shortcut={{ modifiers: ["ctrl"], key: "a" }}
                icon={{ source: Icon.ArrowUp }}
              />
              <Action
                title="Order by Size Descending"
                onAction={() => handleOrderItemsBySize(false)}
                shortcut={{ modifiers: ["ctrl"], key: "z" }}
                icon={{ source: Icon.ArrowDown }}
              />
              <Action
                title="Copy Token"
                onAction={() => {
                  Clipboard.copy(token!);
                  showToast(Toast.Style.Success, "Token copied to clipboard");
                }}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                icon={{ source: Icon.Key }}
              />
              <Action.CopyToClipboard
                title="Copy Filename"
                content={item.name}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
