import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import YAML from "yaml";
import { useEffect, useState } from "react";
import { ActionPanel, Action, List, showToast, Toast, Icon, Keyboard } from "@raycast/api";
import useLocalStorage from "./hooks/useLocalStorage";
import { getLaunchConfigUri, getTabConfigUri } from "./uri";
import {
  CONFIGS_URL,
  NO_CONFIGS_TITLE,
  VIEW_DOCS_ACTION_TITLE,
  OPEN_CONFIGS_DIR_ACTION_TITLE,
  NO_CONFIGS_MESSAGE,
  getAppName,
} from "./constants";

type ConfigKind = "tab" | "launch";

interface SearchResult {
  name: string;
  path: string;
  directory: string;
  kind: ConfigKind;
}

const isWindows = process.platform === "win32";

function getAppDataDir(): string {
  if (isWindows) {
    return process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
  }

  return path.join(os.homedir(), ".warp");
}

function getConfigSources(): Array<{ directory: string; kind: ConfigKind; pattern: RegExp }> {
  const configDir = getAppDataDir();

  if (isWindows) {
    const warpDataDir = path.join(configDir, "Warp", "Warp", "data");
    return [
      { directory: path.join(warpDataDir, "tab_configs"), kind: "tab", pattern: /\.toml$/i },
      { directory: path.join(warpDataDir, "launch_configurations"), kind: "launch", pattern: /\.ya?ml$/i },
    ];
  }

  return [
    { directory: path.join(configDir, "tab_configs"), kind: "tab", pattern: /\.toml$/i },
    { directory: path.join(configDir, "launch_configurations"), kind: "launch", pattern: /\.ya?ml$/i },
  ];
}

const configSources = getConfigSources();
const primaryConfigDir = configSources[0].directory;

function parseConfigName(contents: string, filePath: string, kind: ConfigKind): string | null {
  if (kind === "tab") {
    const match = contents.match(/^name\s*=\s*["'](.+?)["']/m);
    return match ? match[1] : path.basename(filePath, path.extname(filePath));
  }

  const yaml = YAML.parse(contents);
  return yaml?.name ?? path.basename(filePath, path.extname(filePath));
}

function getConfigUri(searchResult: SearchResult): string {
  const configName =
    searchResult.kind === "tab" ? path.basename(searchResult.path, path.extname(searchResult.path)) : searchResult.name;

  return searchResult.kind === "tab" ? getTabConfigUri(configName) : getLaunchConfigUri(configName);
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [configDir, setConfigDir] = useState(primaryConfigDir);
  const {
    data: resultsOrderList,
    setData: setResultsOrderList,
    isLoading: isResultsOrderListLoading,
  } = useLocalStorage<Array<string>>("resultsOrder", []);

  const [error, setError] = useState(false);

  const showError = async (title: string, message: string) => {
    await showToast({
      style: Toast.Style.Failure,
      title,
      message,
    });

    setError(true);
  };

  const init = async () => {
    for (const source of configSources) {
      const exists = await fs.stat(source.directory).catch(() => false);

      if (exists === false) {
        continue;
      }

      const files = await fs.readdir(source.directory).catch(() => null);

      if (files === null || typeof files === "undefined") {
        return showError(
          "Error reading Tab Config directory",
          "Something went wrong while reading the config directory."
        );
      }

      const fileList = (
        await Promise.all(
          files
            .filter((file) => source.pattern.test(file))
            .map(async (file) => {
              const filePath = path.join(source.directory, file);
              const contents = await fs.readFile(filePath, "utf-8");
              const name = parseConfigName(contents, file, source.kind);

              return name ? { name, path: filePath, directory: source.directory, kind: source.kind } : null;
            })
        )
      ).filter((item): item is SearchResult => item !== null);

      if (fileList.length === 0) {
        continue;
      }

      setConfigDir(source.directory);
      const allFileNames = fileList.map(({ name }) => name);
      const resultsOrderListFilteredFromStaleFiles = resultsOrderList.filter(
        (fileName) => allFileNames.indexOf(fileName) !== -1
      );
      const newFileNamesNotPresentOnResultsOrderList = allFileNames.filter(
        (fileName) => resultsOrderList.indexOf(fileName) === -1
      );

      const currentOrderList = [...resultsOrderListFilteredFromStaleFiles, ...newFileNamesNotPresentOnResultsOrderList];
      setResultsOrderList(currentOrderList);
      setResults(
        [...fileList].sort((fileA, fileB) => {
          return currentOrderList.indexOf(fileA.name) - currentOrderList.indexOf(fileB.name);
        })
      );
      return;
    }

    return showError(NO_CONFIGS_TITLE, NO_CONFIGS_MESSAGE);
  };

  let initialized = false;
  useEffect(() => {
    if (initialized || isResultsOrderListLoading) {
      return;
    }
    initialized = true;
    init();
  }, [isResultsOrderListLoading]);

  const swapSearchItems = (currentIndex: number, swapIndex: number) => {
    if (swapIndex < 0 || swapIndex >= results.length) {
      return;
    }

    const resultsOrderCopy = [...resultsOrderList];
    [resultsOrderCopy[currentIndex], resultsOrderCopy[swapIndex]] = [
      resultsOrderCopy[swapIndex],
      resultsOrderCopy[currentIndex],
    ];
    setResultsOrderList(resultsOrderCopy);

    const resultsCopy = [...results];
    [resultsCopy[currentIndex], resultsCopy[swapIndex]] = [resultsCopy[swapIndex], resultsCopy[currentIndex]];
    setResults(resultsCopy);
  };

  return (
    <List
      isLoading={results.length === 0 && !error}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Searching for Tab Configs..."
      throttle
    >
      <List.EmptyView
        title={NO_CONFIGS_TITLE}
        description={NO_CONFIGS_MESSAGE}
        icon={Icon.Terminal}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.ShowInFinder title={OPEN_CONFIGS_DIR_ACTION_TITLE} path={configDir} icon={Icon.Folder} />
              <Action.OpenInBrowser title={VIEW_DOCS_ACTION_TITLE} url={CONFIGS_URL} icon={Icon.Document} />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
      <List.Section title="Results" subtitle={results?.length + ""}>
        {results
          ?.filter((f) => f.name.toLowerCase().includes(searchText.toLowerCase()))
          .map((searchResult, index) => (
            <SearchListItem
              key={searchResult.path}
              searchResult={searchResult}
              isSearching={searchText.length > 0}
              moveSearchResultDown={() => {
                swapSearchItems(index, index + 1);
                showToast(Toast.Style.Success, `Moved down`);
              }}
              moveSearchResultUp={() => {
                swapSearchItems(index, index - 1);
                showToast(Toast.Style.Success, `Moved up`);
              }}
            />
          ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({
  searchResult,
  isSearching,
  moveSearchResultUp,
  moveSearchResultDown,
}: {
  searchResult: SearchResult;
  isSearching: boolean;
  moveSearchResultUp: () => void;
  moveSearchResultDown: () => void;
}) {
  return (
    <List.Item
      title={searchResult.name}
      subtitle={searchResult.path.replace(searchResult.directory + path.sep, "")}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title={`Launch in ${getAppName()}`}
              icon={Icon.Terminal}
              url={getConfigUri(searchResult)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.ShowInFinder
              title={isWindows ? "Reveal in File Explorer" : "Reveal in Finder"}
              path={searchResult.path}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.Open
              title={searchResult.kind === "tab" ? "Edit Tab Config" : "Edit Launch Configuration"}
              target={searchResult.path}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
            <Action.CreateQuicklink
              title="Save as Quicklink"
              quicklink={{ link: getConfigUri(searchResult), name: searchResult.name }}
            />
            <Action.ShowInFinder
              title={OPEN_CONFIGS_DIR_ACTION_TITLE}
              path={searchResult.directory}
              icon={Icon.Folder}
            />
            <Action.OpenInBrowser title={VIEW_DOCS_ACTION_TITLE} url={CONFIGS_URL} icon={Icon.Document} />
            {!isSearching && (
              <>
                <Action
                  title="Move up"
                  shortcut={Keyboard.Shortcut.Common.MoveUp}
                  onAction={moveSearchResultUp}
                  icon={Icon.ArrowUp}
                />
                <Action
                  title="Move down"
                  shortcut={Keyboard.Shortcut.Common.MoveDown}
                  onAction={moveSearchResultDown}
                  icon={Icon.ArrowDown}
                />
              </>
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
