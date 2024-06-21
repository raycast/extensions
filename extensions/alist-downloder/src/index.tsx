import {
  List,
  ActionPanel,
  Action,
  getPreferenceValues,
  showToast,
  Toast,
  Clipboard,
  Form,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import axios from "axios";
import { promisify } from "util";
import { exec } from "child_process";
import fs from "fs";
import { join } from "path";
import { homedir } from "os";

interface Preferences {
  username: string;
  password: string;
  host: string;
  downloadCommand: string;
}

interface AlistItem {
  name: string;
  size: number;
  is_dir: boolean;
  sign?: string;
}

interface APIResponse {
  data: {
    content: AlistItem[];
  };
}

const asyncExec = promisify(exec);

class DownloadCMD {
  command: string;
  url: string;
  filename: string;

  constructor(cmdTemplate: string, url: string, filename: string) {
    this.command = cmdTemplate.replace("{url}", url).replace("{filename}", filename);
    this.url = url;
    this.filename = filename;
  }

  async execute(): Promise<boolean> {
    try {
      const { stdout, stderr } = await asyncExec(this.command);
      console.log("Command output:", stdout);
      if (stderr) {
        console.error("Command error output:", stderr);
      }
      return false;
    } catch (error) {
      console.error("Error executing download command:", error);
      return true;
    }
  }
}

const preferences = getPreferenceValues<Preferences>();
const HOST = preferences.host;
const AUTH_URL = `${HOST}/api/auth/login`;
const API_BASE_URL = `${HOST}/api/fs`;
const CMD = preferences.downloadCommand;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchToken = async (username: string, password: string) => {
  const response = await axios.post(AUTH_URL, { username, password });
  return response.data.data.token;
};

const fetchData = async (token: string, path: string) => {
  const response = await axios.post<APIResponse>(
    `${API_BASE_URL}/list`,
    { path, password: "", page: 1, per_page: 0, refresh: false },
    { headers: { Authorization: token, "Content-Type": "application/json" } },
  );
  return response.data.data.content;
};

const fetchFileDetails = async (token: string, path: string) => {
  const response = await axios.post(
    `${API_BASE_URL}/get`,
    { path, password: "", page: 1, per_page: 0, refresh: false },
    { headers: { Authorization: token, "Content-Type": "application/json" } },
  );
  return response.data.data;
};

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
        const fetchedToken = await fetchToken(preferences.username, preferences.password);
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
    setFilteredItems(filtered);
  };

  const fetchDownloadLink = async (item: AlistItem) => {
    const currentPath = pathStack[pathStack.length - 1];
    const fileDetails = await fetchFileDetails(token!, `${currentPath}/${item.name}`);
    return `${HOST}/d/${encodeURIComponent(item.name)}?sign=${fileDetails.sign}`;
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

  return (
    <List isLoading={loading} searchText={searchText} onSearchTextChange={setSearchText} filtering={true}>
      {filteredItems.map((item) => (
        <List.Item
          key={item.name}
          title={item.name}
          accessories={[{ text: item.is_dir ? "Directory" : displayFileSize(item) }]}
          actions={
            <ActionPanel>
              {!item.is_dir && <Action title="Download File" onAction={() => handleDownloadFile(item)} />}
              {item.is_dir && (
                <Action
                  title="Open Directory"
                  onAction={() => handleNavigateToDirectory(`${pathStack[pathStack.length - 1]}/${item.name}`)}
                />
              )}
              <Action title="Copy Download Link" onAction={() => handleDownloadLinkCopy(item)} />
              <Action
                title="Copy Download Command"
                onAction={() => handleCopyDownloadCommand(item)}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action title="Go Back" onAction={handleNavigateBack} shortcut={{ modifiers: ["shift"], key: "enter" }} />
              <Action title="Show Only Files" onAction={toggleOnlyFiles} shortcut={{ modifiers: ["cmd"], key: "f" }} />
              <Action
                title="Refresh"
                onAction={() => fetchItemsForPath(pathStack[pathStack.length - 1])}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action.OpenInBrowser url={HOST} shortcut={{ modifiers: ["cmd"], key: "o" }} />
              <Action
                title="Order by Size Ascending"
                onAction={() => handleOrderItemsBySize(true)}
                shortcut={{ modifiers: ["ctrl"], key: "a" }}
              />
              <Action
                title="Order by Size Descending"
                onAction={() => handleOrderItemsBySize(false)}
                shortcut={{ modifiers: ["ctrl"], key: "z" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

interface DownloadFormProps {
  item: AlistItem;
  token: string;
  path: string;
}

function displayFileSize(item: AlistItem) {
  if (item.size < 1024) {
    return `${item.size} B`;
  } else if (item.size < 1024 * 1024) {
    return `${(item.size / 1024).toFixed(2)} KB`;
  } else if (item.size < 1024 * 1024 * 1024) {
    return `${(item.size / (1024 * 1024)).toFixed(2)} MB`;
  } else {
    return `${(item.size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

function DownloadForm({ item, token, path }: DownloadFormProps) {
  const [filename, setFilename] = useState<string>(item.name);
  const { pop } = useNavigation();

  const handleSubmit = async (values: { folders: string[] }) => {
    const destination = values.folders[0];
    if (!fs.existsSync(destination) || !fs.lstatSync(destination).isDirectory()) {
      showToast(Toast.Style.Failure, "Invalid Destination", "Selected destination directory does not exist.");
      return false;
    }

    const fileDetails = await fetchFileDetails(token, `${path}/${item.name}`);
    const downloadLink = `${HOST}/d/${encodeURIComponent(item.name)}?sign=${fileDetails.sign}`;

    const downloadPath = join(destination, filename);
    const command = new DownloadCMD(CMD, downloadLink, downloadPath);
    showToast(Toast.Style.Animated, "Executing download command...");
    const isFailed = await command.execute();
    isFailed
      ? showToast(Toast.Style.Failure, "Failed to download file", "Check the console for more information.")
      : showToast(Toast.Style.Success, "File downloaded successfully");
    await sleep(1000);
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Download" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Downloading ${item.name}`} />
      <Form.TextField id="filename" title="Filename" placeholder="Filename" value={filename} onChange={setFilename} />
      <Form.FilePicker
        id="folders"
        title="Folder"
        defaultValue={[`${homedir()}/Downloads`]}
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
    </Form>
  );
}
