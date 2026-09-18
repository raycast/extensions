import { useState, useEffect, useRef } from "react";
import {
  ActionPanel,
  Action,
  Form,
  Icon,
  showToast,
  Toast,
  environment,
  getPreferenceValues,
  showInFinder,
  LocalStorage,
  popToRoot,
} from "@raycast/api";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { fileURLToPath } from "url";
import { rankByQuery } from "./search";
import { searchFolders } from "./folder-search";

function getPreferencePath(): string | undefined {
  try {
    const prefs = getPreferenceValues<Preferences>();
    return prefs.linksPath?.trim() || undefined;
  } catch {
    return undefined;
  }
}

function getExportSourcePath(): string | undefined {
  const prefPath = getPreferencePath();
  const candidates = [
    prefPath,
    path.join(environment.supportPath, "links.json"),
    path.join(environment.assetsPath, "links.json"),
  ].filter((candidate): candidate is string => Boolean(candidate));

  return candidates.find((candidate) => fs.existsSync(candidate));
}

// Helper to format date as YYYY-MM-DDTHH.MM.SS
function getFormattedDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}.${minutes}.${seconds}`;
}

type Location = { path: string; name: string; detail?: string };

function isDirectory(target: string): boolean {
  try {
    return fs.statSync(target).isDirectory();
  } catch {
    return false;
  }
}

function displayPath(dir: string): string {
  const home = os.homedir();
  return dir.startsWith(home + path.sep) ? `~${dir.slice(home.length)}` : dir;
}

// A folder shown with its parent, so two folders with the same name can be told apart
function toLocation(folder: string): Location {
  return { path: folder, name: path.basename(folder) || folder, detail: displayPath(path.dirname(folder)) };
}

function locationTitle(location: Location): string {
  return location.detail ? `${location.name} — ${location.detail}` : location.name;
}

// Accepts what people actually paste: ~/Documents, "/quoted/path", file:///Users/me/Folder/, trailing slashes
function resolveTypedPath(input: string): string {
  let value = input.trim().replace(/^["']|["']$/g, "");
  if (value.startsWith("file://")) {
    try {
      value = fileURLToPath(value);
    } catch {
      // keep the raw text, the folder check below reports it
    }
  }
  if (value === "~" || value.startsWith("~/")) value = path.join(os.homedir(), value.slice(1));
  return path.resolve(value);
}

// The native folder dialog of Form.FilePicker makes Raycast hide its window, so the extension never receives the
// chosen folder. Locations are picked from a searchable dropdown, or typed/pasted into a text field, instead.
function getLocations(remembered?: string): Location[] {
  const home = os.homedir();
  const standard: Location[] = [
    { path: path.join(home, "Downloads"), name: "Downloads" },
    { path: path.join(home, "Desktop"), name: "Desktop" },
    { path: path.join(home, "Documents"), name: "Documents" },
    ...(process.platform === "darwin"
      ? [{ path: path.join(home, "Library", "Mobile Documents", "com~apple~CloudDocs"), name: "iCloud Drive" }]
      : []),
    { path: home, name: "Home" },
  ].filter((location) => isDirectory(location.path));

  if (!remembered) return standard;

  // The last used folder goes first so it is preselected, without duplicating a standard location
  const known = standard.find((location) => location.path === remembered);
  return [known ?? toLocation(remembered), ...standard.filter((location) => location !== known)];
}

export default function ExportCommand() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selected, setSelected] = useState<Location | null>(null);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [customPath, setCustomPath] = useState("");
  const [customPathError, setCustomPathError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const latestSearch = useRef(0);

  // Load the last used folder from LocalStorage on mount and preselect it
  useEffect(() => {
    (async () => {
      let remembered: string | undefined;
      try {
        const stored = await LocalStorage.getItem<string>("lastExportFolder");
        if (stored && isDirectory(stored)) remembered = stored;
      } catch {
        // fall back to the default locations
      }
      const list = getLocations(remembered);
      setLocations(list);
      setSelected(list[0] ?? toLocation(os.homedir()));
      setIsLoading(false);
    })();
  }, []);

  // Typing in the dropdown searches every folder under the home directory, including iCloud Drive
  function handleSearchTextChange(text: string) {
    setSearchText(text);
    const searchId = ++latestSearch.current;

    if (!text.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchFolders(text)
      .then((folders) => {
        if (searchId !== latestSearch.current) return; // a newer search replaced this one
        setSearchResults(folders.map(toLocation));
        setIsSearching(false);
      })
      .catch(() => {
        if (searchId === latestSearch.current) setIsSearching(false);
      });
  }

  async function handleSubmit() {
    const typed = customPath.trim();
    const destFolder = typed ? resolveTypedPath(typed) : selected?.path;

    if (!destFolder || !isDirectory(destFolder)) {
      setCustomPathError("This folder doesn't exist");
      await showToast({ style: Toast.Style.Failure, title: "Folder not found", message: destFolder });
      return;
    }

    const sourcePath = getExportSourcePath();

    if (!sourcePath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No links found",
        message: "You haven't saved any links yet.",
      });
      return;
    }

    try {
      const fileName = `LinksFolder_JsonFile_${getFormattedDateString()}.json`;
      const exportPath = path.join(destFolder, fileName);

      // Copy the JSON to the chosen directory
      fs.copyFileSync(sourcePath, exportPath);

      // Save this folder choice for the next time
      await LocalStorage.setItem("lastExportFolder", destFolder);

      await showToast({
        style: Toast.Style.Success,
        title: "Exported Successfully",
        message: `Saved as ${fileName}`,
        primaryAction: {
          title: "Show in Finder",
          onAction: () => showInFinder(exportPath),
        },
      });

      popToRoot();
    } catch (error) {
      console.error("Export failed:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Export Failed",
        message: String(error),
      });
    }
  }

  if (isLoading || !selected) {
    return <Form isLoading={true} />;
  }

  // Folders shown in the dropdown: the defaults when idle, ranked matches while searching
  const query = searchText.trim();
  const candidates = [
    ...locations,
    ...searchResults.filter((result) => !locations.some((location) => location.path === result.path)),
  ];
  const matches = query ? rankByQuery(candidates, query, (location) => ({ primary: location.name })) : locations;
  // The selected folder always stays in the list, otherwise the dropdown loses its value while searching
  const items = matches.some((location) => location.path === selected.path) ? matches : [selected, ...matches];

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Export Links" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Choose a destination to export your links.json file. Type in Save Location to search all your folders, including iCloud Drive. Raycast will remember this location for your next export." />

      <Form.Dropdown
        id="destination"
        title="Save Location"
        placeholder="Search all folders…"
        value={selected.path}
        onChange={(value) => {
          const chosen = candidates.find((location) => location.path === value);
          if (chosen) setSelected(chosen);
        }}
        filtering={false}
        throttle
        isLoading={isSearching}
        onSearchTextChange={handleSearchTextChange}
      >
        {items.map((location) => (
          <Form.Dropdown.Item
            key={location.path}
            value={location.path}
            title={locationTitle(location)}
            icon={Icon.Folder}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="customPath"
        title="Other Folder"
        placeholder="Optional: paste a folder path"
        info="Overrides Save Location. In Finder, select a folder and press ⌥⌘C to copy its path, then paste it here. ~ works too."
        value={customPath}
        onChange={(value) => {
          setCustomPath(value);
          setCustomPathError(undefined);
        }}
        error={customPathError}
      />
    </Form>
  );
}
