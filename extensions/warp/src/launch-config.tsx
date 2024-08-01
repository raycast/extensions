import { ActionPanel, Action, List, showToast, Toast, Icon } from "@raycast/api";
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
    data: resultsWeights,
    setData: setResultsWeights,
    isLoading: isResultsWeightsLoading,
  } = useLocalStorage<{ [key: string]: number }>("resultsWeights", {});

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

    if (Object.keys(resultsWeights).length > 0) {
      const filteredResultsWeights: { [key: string]: number } = {};
      for (const key of Object.keys(resultsWeights)) {
        if (fileList.find((file) => file.name === key)) {
          filteredResultsWeights[key] = resultsWeights[key];
        }
      }
      setResultsWeights(filteredResultsWeights)
    } else {
      const initialWeights: { [key: string]: number } = {};
      fileList.forEach((obj, index) => {
        initialWeights[obj.name] = index;
      });
      setResultsWeights(initialWeights)
    }

    setResults(
      fileList.sort((fileA, fileB) => {
        return (resultsWeights[fileB.name] || 0) - (resultsWeights[fileA.name] || 0);
      })
    );
  };

  let initialized = false;
  useEffect(() => {
    if (initialized || isResultsWeightsLoading) {
      return;
    }
    initialized = true;
    init();
  }, [isResultsWeightsLoading]);

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
              isSearching={searchText.length > 0}
              key={searchResult.path}
              searchResult={searchResult}
              moveSearchResultDown={() => {
                if (index >= results.length - 1) {
                  return;
                }
                const swappedResult = results[index + 1];
                const resultsWeightsCopy = { ...resultsWeights };
                resultsWeightsCopy[searchResult.name] = resultsWeightsCopy[searchResult.name] - 1;
                resultsWeightsCopy[swappedResult.name] = resultsWeightsCopy[swappedResult.name] + 1;
                setResultsWeights(resultsWeightsCopy);

                const resultsCopy: Array<SearchResult> = [...results];
                [resultsCopy[index], resultsCopy[index + 1]] = [resultsCopy[index + 1], resultsCopy[index]];
                setResults(resultsCopy);
              }}
              moveSearchResultUp={() => {
                if (index === 0) {
                  return;
                }
                const swappedResult = results[index - 1];
                const resultsWeightsCopy = { ...resultsWeights };
                resultsWeightsCopy[searchResult.name] = resultsWeightsCopy[searchResult.name] + 1;
                resultsWeightsCopy[swappedResult.name] = resultsWeightsCopy[swappedResult.name] - 1;
                setResultsWeights(resultsWeightsCopy);

                const resultsCopy: Array<SearchResult> = [...results];
                [resultsCopy[index], resultsCopy[index - 1]] = [resultsCopy[index - 1], resultsCopy[index]];
                setResults(resultsCopy);
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
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            <Action.CreateQuicklink
              title="Save as Quicklink"
              quicklink={{ link: launchConfig(searchResult.name), name: searchResult.name }}
            />
            {!isSearching && (
              <Action
                title="Move up"
                shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                onAction={moveSearchResultUp}
              />
            )}
            {!isSearching && (
              <Action
                title="Move down"
                shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                onAction={moveSearchResultDown}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
