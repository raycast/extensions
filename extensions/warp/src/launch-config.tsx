import { ActionPanel, Action, List, showToast, Toast, Icon, Keyboard } from "@raycast/api";
import useLocalStorage from "./hooks/useLocalStorage";
import { useEffect, useState } from "react";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import YAML from "yaml";
import { launchConfig } from "./uri";

interface SearchResult {
  name: string;
  path: string;
}

const configPath = ".warp/launch_configurations";
const fullPath = path.join(os.homedir(), configPath);

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
      return showError("Launch configuration directory missing", `~/${configPath} wasn't found on your computer!`);
    }

    const files = await fs.readdir(fullPath).catch(() => null);

    if (files === null || typeof files === "undefined") {
      return showError(
        "Error reading launch configuration directory",
        "Something went wrong while reading the launch configuration directory."
      );
    }

    const fileList = await Promise.all(
      files
        .filter((file) => file.match(/.y(a)?ml$/g))
        .map(async (file) => {
          const contents = await fs.readFile(path.join(fullPath, file), "utf-8");
          const yaml = YAML.parse(contents);

          return { name: yaml.name, path: path.join(fullPath, file) };
        })
    );

    if (fileList.length === 0) {
      return showError(
        "No launch configurations found",
        "You need to create at least one launch configuration before launching: https://docs.warp.dev/features/sessions/launch-configurations"
      );
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
      searchBarPlaceholder="Searching for launch configurations..."
      throttle
    >
      <List.EmptyView
        title="No launch configurations found"
        description="You need to create at least one launch configuration before launching https://docs.warp.dev/features/sessions/launch-configurations."
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
      subtitle={searchResult.path.replace(fullPath + "/", "")}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Launch" icon={Icon.Terminal} url={launchConfig(searchResult.name)} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.ShowInFinder
              title="Reveal in Finder"
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
              quicklink={{ link: launchConfig(searchResult.name), name: searchResult.name }}
            />
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
