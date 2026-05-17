import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import YAML from "yaml";
import { useEffect, useState } from "react";
import { ActionPanel, Action, List, showToast, Toast, Icon, Keyboard } from "@raycast/api";
import useLocalStorage from "./hooks/useLocalStorage";
import { getLaunchConfigUri } from "./uri";
import {
  LAUNCH_CONFIGS_URL,
  NO_LAUNCH_CONFIGS_TITLE,
  VIEW_DOCS_ACTION_TITLE,
  OPEN_CONFIGS_DIR_ACTION_TITLE,
  NO_LAUNCH_CONFIGS_MESSAGE,
  getAppName,
} from "./constants";

interface SearchResult {
  name: string;
  path: string;
}

const isWindows = process.platform === "win32";

function getConfigDir(): string {
  if (isWindows) {
    const appData = process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "Warp", "Warp", "data", "tab_configs");
  }
  return path.join(os.homedir(), ".warp", "launch_configurations");
}

const fullPath = getConfigDir();
const configFilePattern = isWindows ? /\.toml$/i : /\.ya?ml$/i;

function parseConfigName(contents: string, filePath: string): string | null {
  if (isWindows) {
    const match = contents.match(/^name\s*=\s*["'](.+?)["']/m);
    return match ? match[1] : null;
  }
  const yaml = YAML.parse(contents);
  return yaml?.name ?? path.basename(filePath, path.extname(filePath));
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
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
    const exists = await fs.stat(fullPath).catch(() => false);

    if (exists === false) {
      return showError("Launch Configuration directory missing", `${fullPath} wasn't found on your computer!`);
    }

    const files = await fs.readdir(fullPath).catch(() => null);

    if (files === null || typeof files === "undefined") {
      return showError(
        "Error reading Launch Configuration directory",
        "Something went wrong while reading the Launch Configuration directory."
      );
    }

    const fileList = (
      await Promise.all(
        files
          .filter((file) => configFilePattern.test(file))
          .map(async (file) => {
            const contents = await fs.readFile(path.join(fullPath, file), "utf-8");
            const name = parseConfigName(contents, file);

            return name ? { name, path: path.join(fullPath, file) } : null;
          })
      )
    ).filter((item): item is SearchResult => item !== null);

    if (fileList.length === 0) {
      return showError(NO_LAUNCH_CONFIGS_TITLE, NO_LAUNCH_CONFIGS_MESSAGE);
    }

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
      searchBarPlaceholder="Searching for Launch Configurations..."
      throttle
    >
      <List.EmptyView
        title={NO_LAUNCH_CONFIGS_TITLE}
        description={NO_LAUNCH_CONFIGS_MESSAGE}
        icon={Icon.Terminal}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.ShowInFinder title={OPEN_CONFIGS_DIR_ACTION_TITLE} path={fullPath} icon={Icon.Folder} />
              <Action.OpenInBrowser title={VIEW_DOCS_ACTION_TITLE} url={LAUNCH_CONFIGS_URL} icon={Icon.Document} />
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
      subtitle={searchResult.path.replace(fullPath + path.sep, "")}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title={`Launch in ${getAppName()}`}
              icon={Icon.Terminal}
              url={getLaunchConfigUri(searchResult.name)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.ShowInFinder
              title={isWindows ? "Reveal in File Explorer" : "Reveal in Finder"}
              path={searchResult.path}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.Open
              title="Edit Launch Configuration"
              target={searchResult.path}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
            <Action.CreateQuicklink
              title="Save as Quicklink"
              quicklink={{ link: getLaunchConfigUri(searchResult.name), name: searchResult.name }}
            />
            <Action.ShowInFinder title={OPEN_CONFIGS_DIR_ACTION_TITLE} path={fullPath} icon={Icon.Folder} />
            <Action.OpenInBrowser title={VIEW_DOCS_ACTION_TITLE} url={LAUNCH_CONFIGS_URL} icon={Icon.Document} />
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
