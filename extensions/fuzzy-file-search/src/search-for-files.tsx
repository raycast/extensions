import { ActionPanel, List, Action, getPreferenceValues } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { exec } from "child_process";
import { promisify } from "util";
import { Fzf } from "fzf";
import { basename } from "path";
import { useState } from "react";
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
  const [searchRoot, setSearchRoot] = useState<string>("~");

  const homePath = process.env.HOME;
  if (homePath === undefined) {
    console.error("$HOME environmental variable undefined");
    throw new Error("$HOME environmental variable undefined");
  }

  const { data: fdPath, isLoading: isFdLoading } = useCachedPromise(async () => {
    try {
      return await ensureFdCLI();
    } catch (error) {
      throw new Error(`Couldn't load the fd CLI: ${error}`);
    }
  });

  // Get all filepaths
  const { data: fzf, isLoading: isFzfLoading } = usePromise(
    async (searchRoot: string, fdPath: string | undefined) => {
      if (fdPath === undefined) {
        return new Fzf([] as string[]);
      }
      const { stdout, stderr } = await execAsync(
        `"${fdPath}" ${prefs.includeDirectories ? "" : "--type file"} --follow . ${searchRoot}`,
        {
          maxBuffer: 1024 * 1024 * 50, // 50 MiB
        },
      );
      if (stderr.length !== 0) {
        console.error(stderr);
        throw new Error(stderr);
      }
      const filepaths = stdout.split("\n");
      return new Fzf(filepaths);
    },
    [searchRoot, fdPath],
  );

  // Filter filepaths for search term using fzf
  const { data: filteredPaths, isLoading: isFilteredPathsLoading } = usePromise(
    async (searchText: string, fzf: Fzf<string[]> | undefined) => {
      if (fzf === undefined) {
        return [];
      }

      let searchTerm = searchText;
      if (prefs.ignoreSpacesInSearch) {
        searchTerm = searchText.replaceAll(" ", "");
      }

      return fzf.find(searchTerm).map((v) => v.item);
    },
    [searchText, fzf],
    {
      execute: fzf !== undefined,
    },
  );

  return (
    <List
      navigationTitle="Search Files"
      isLoading={isFdLoading || isFzfLoading || isFilteredPathsLoading}
      searchBarPlaceholder={"Search for your files"}
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
      {filteredPaths?.map((filepath) => (
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
