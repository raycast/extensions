import { ActionPanel, List, Action, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { exec } from "child_process";
import { promisify } from "util";
import { Fzf } from "fzf";
import { basename } from "path";
import { useEffect, useState } from "react";
import { ensureFdCLI } from "./lib/fd-downloader";

const execAsync = promisify(exec);

type Prefs = {
  includeDirectories: boolean;
  ignoreSpacesInSearch: boolean;
  customSearchDirs: string;
};

export default function Command() {
  const prefs = getPreferenceValues<Prefs>();

  const [searchText, setSearchText] = useState("");
  const [filteredPaths, filterPaths] = useState<string[]>([]);
  const [fzf, setFzf] = useState(new Fzf([""]));
  const [searchRoot, setSearchRoot] = useState<string>("~");

  const homePath = process.env.HOME;
  if (homePath === undefined) {
    console.error("$HOME environmental variable undefined");
    throw new Error("$HOME environmental variable undefined");
  }

  // Get the file list
  const { isLoading, data } = usePromise(
    async (searchRoot: string) => {
      let fdPath: string = "";
      try {
        fdPath = await ensureFdCLI();
      } catch (error) {
        throw new Error(`Couldn't load the fd CLI: ${error}`);
      }

      const { stdout, stderr } = await execAsync(
        `"${fdPath}" ${prefs.includeDirectories ? "" : "--type file"} --follow . ${searchRoot}`,
        {
          maxBuffer: 1024 * 1024 * 50, // 50 MiB
        },
      );
      if (stderr.length !== 0) {
        console.error(stderr);
        return;
      }
      const filepaths = stdout.split("\n");
      setFzf(new Fzf(filepaths));
      return filepaths;
    },
    [searchRoot],
  );

  // Filter file paths for search term
  useEffect(() => {
    if (data === undefined) {
      filterPaths([]);
      return;
    }
    if (searchText.length === 0) {
      filterPaths(data);
      return;
    }

    let searchTerm = searchText;
    if (prefs.ignoreSpacesInSearch) {
      searchTerm = searchText.replaceAll(" ", "");
    }

    const newPaths = fzf.find(searchTerm).map((v) => v.item);
    filterPaths(newPaths);
  }, [searchText, searchRoot, isLoading]);

  return (
    <List
      navigationTitle="Search Files"
      isLoading={isLoading}
      searchBarPlaceholder={isLoading ? "Loading" : "Search for your files"}
      onSearchTextChange={setSearchText}
      filtering={false} // disable builtin filtering as we use a custom one
      throttle // don't re-render on every key-press, adds delay
      searchBarAccessory={
        <List.Dropdown tooltip="Search in directory" value={searchRoot} onChange={setSearchRoot}>
          <List.Dropdown.Item title="Home (~)" value={"~"} />
          <List.Dropdown.Item title={`Custom Directories`} value={prefs.customSearchDirs} />
        </List.Dropdown>
      }
    >
      {filteredPaths.map((filepath) => (
        <List.Item
          key={filepath}
          title={filepath.startsWith(homePath) ? filepath.replace(homePath, "~") : filepath}
          subtitle={basename(filepath)}
          actions={
            <ActionPanel>
              <Action.Open title="Open" target={filepath} />
              <Action.ShowInFinder title="Show in Finder" path={filepath} />
              <Action.CopyToClipboard
                title="Copy Path to Clipboard"
                content={filepath}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
