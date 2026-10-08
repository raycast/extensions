import { List, Icon, ActionPanel, Action, useNavigation, getPreferenceValues } from "@raycast/api";
import { useGraphsConfig } from "./utils";
import { debounce } from "debounce";
import { SingleGraphSearchView, searchSingleGraphMinimal, MinimalSearchResult } from "./components";
import { keys, values } from "./utils";
import { useEffect, useMemo, useState } from "react";
import { useCachedPromise } from "@raycast/utils";

interface GraphResults {
  minimalSearchResults: MinimalSearchResult[];
  counts: number[];
}

type GraphName = string;
// we can't return things like errors from useCachedPromise because to be cached, it needs to be JSON-serializable
type ErrorMessage = string;

type GraphResultsOrErrorMessage = GraphResults | ErrorMessage;

function isGraphResultsOrErrorMessageAnError(val: GraphResultsOrErrorMessage) {
  return typeof val === "string";
}

type GraphsMinimalResultsOrErrorMessageMap = Record<GraphName, GraphResultsOrErrorMessage>;

export default function Command() {
  // TODO: I feel the code in this command is not that good (is hard to understand and change)
  //   Do a proper refactoring of this later
  const { graphsConfig, orderedGraphNames } = useGraphsConfig();
  // Filter to graphs with read capability (undefined = full access for backward compat)
  const readableGraphsConfig = useMemo(() => {
    const result: GraphsConfigMap = {};
    for (const name of keys(graphsConfig)) {
      if (graphsConfig[name].capabilities?.read !== false) {
        result[name] = graphsConfig[name];
      }
    }
    return result;
  }, [graphsConfig]);
  const [graphNames, setGraphNames] = useState<string[]>([]);

  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();

  // data shown in the search text box
  const [textData, setTextData] = useState<string>("");
  // data which is textData but after debouncing
  const [searchText, setSearchText] = useState("");

  const changeResult = useMemo(
    () =>
      debounce((text: string, setSearchText: (text: string) => any) => {
        text = text.trim();
        if (!text || text.length < 2) {
          return;
        }
        setSearchText(text);
      }, 500),
    []
  );
  useEffect(() => () => changeResult.clear(), [changeResult]);

  const {
    isLoading,
    data,
  }: {
    isLoading: boolean;
    data: GraphsMinimalResultsOrErrorMessageMap | undefined;
  } = useCachedPromise(
    (graphsConfig, query: string) => {
      if (!graphsConfig || keys(graphsConfig).length === 0) {
        return Promise.resolve(undefined);
      }
      return Promise.allSettled(
        values(graphsConfig).map(
          (graphConfig) =>
            new Promise((resolve, reject) => {
              searchSingleGraphMinimal(graphConfig, query, preferences.hideCodeBlocksInSearch)
                .then((results) => resolve([graphConfig.nameField, results]))
                .catch(
                  // errors here show up as a red cross (i.e. X) in the graph list item accessories
                  (e) => reject([graphConfig.nameField, e])
                );
            })
        )
      ).then((results) => {
        const graphsResultsMap: GraphsMinimalResultsOrErrorMessageMap = {};
        for (const result of results) {
          if (result.status === "fulfilled") {
            const [graphName, minimalResults] = result.value as [string, MinimalSearchResult[]];
            const counts = !minimalResults
              ? [0, 0]
              : minimalResults.reduce(
                  (countsAcc, minimalSearchResult: MinimalSearchResult) => {
                    const [pageCount, blockCount] = countsAcc;
                    if (minimalSearchResult[":node/title"]) {
                      return [pageCount + 1, blockCount];
                    } else {
                      return [pageCount, blockCount + 1];
                    }
                  },
                  [0, 0]
                );
            graphsResultsMap[graphName] = {
              minimalSearchResults: minimalResults,
              counts: counts,
            };
          } else {
            const [graphName, err] = result.reason as [string, Error];
            graphsResultsMap[graphName] = err.message;
          }
        }
        return graphsResultsMap;
      });
    },
    [readableGraphsConfig, searchText],
    { keepPreviousData: true }
  );

  useEffect(() => {
    // Start from user-configured order, filtered to readable graphs
    const readableOrdered = orderedGraphNames.filter((name) => readableGraphsConfig[name]);
    readableOrdered.sort(function (a: GraphName, b: GraphName) {
      if (data) {
        const da = data[a];
        const db = data[b];
        if (!da || isGraphResultsOrErrorMessageAnError(da)) return 1;
        if (!db || isGraphResultsOrErrorMessageAnError(db)) return -1;
        const aCounts = (da as GraphResults)["counts"][0] + (da as GraphResults)["counts"][1];
        const bCounts = (db as GraphResults)["counts"][0] + (db as GraphResults)["counts"][1];
        if (bCounts !== aCounts) return bCounts - aCounts;
      }
      // Tiebreaker: user-configured graph order (already in orderedGraphNames order)
      return 0;
    });
    setGraphNames(readableOrdered);
  }, [readableGraphsConfig, orderedGraphNames, data]);

  if (graphNames.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Tray}
          title={keys(graphsConfig).length === 0 ? "Please add graph first" : "No graphs with read access"}
        />
      </List>
    );
  }
  if (graphNames.length === 1) {
    const graphConfig = readableGraphsConfig[graphNames[0]];
    return <SingleGraphSearchView graphConfig={graphConfig} />;
  }

  const getAccessories = (graphSearchDataOrError: GraphResultsOrErrorMessage | false) => {
    // let graphSearchDataOrError = (textData && textData.length >= 2 && searchText === textData.trim() && data && data[graphName]);
    if (!graphSearchDataOrError) {
      return [];
    } else if (isGraphResultsOrErrorMessageAnError(graphSearchDataOrError)) {
      return [{ text: `❌` }];
    } else {
      const graphSearchData = graphSearchDataOrError as GraphResults;
      const counts = graphSearchData["counts"];
      const totalCounts = counts[0] + counts[1];
      const didHitLimit = totalCounts >= 100;
      return [
        {
          text: `${counts[0]}`,
          icon: Icon.List,
        },
        {
          text: `${counts[1]}${didHitLimit ? "+" : ""}`,
          icon: Icon.Dot,
        },
      ];
    }
  };

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchText={textData}
      onSearchTextChange={(text) => {
        setTextData(text);
        changeResult(text, setSearchText);
      }}
      navigationTitle="Search across graphs"
      searchBarPlaceholder="Select graph to search or just start typing"
    >
      {graphNames.map((graphName) => {
        const graphSearchDataOrError =
          textData && textData.length >= 2 && searchText === textData.trim() && data && data[graphName];
        const isError = !graphSearchDataOrError ? false : isGraphResultsOrErrorMessageAnError(graphSearchDataOrError);
        return (
          <List.Item
            title={graphName}
            key={graphName}
            icon={Icon.MagnifyingGlass}
            accessories={[...(isLoading ? [] : getAccessories(graphSearchDataOrError || false))]}
            actions={
              !isError && (
                <ActionPanel>
                  <Action
                    icon={Icon.MagnifyingGlass}
                    title="Search Graph"
                    onAction={() => {
                      const graphConfig = readableGraphsConfig[graphName];
                      const singleGraphSearchInitData =
                        searchText === textData.trim() &&
                        data &&
                        data[graphName] &&
                        !isGraphResultsOrErrorMessageAnError(data[graphName]) &&
                        (data[graphName] as GraphResults)["minimalSearchResults"]
                          ? {
                              minimalSearchResults: (data[graphName] as GraphResults)["minimalSearchResults"],
                              searchText: searchText,
                            }
                          : undefined;
                      push(
                        <SingleGraphSearchView
                          graphConfig={graphConfig}
                          singleGraphSearchInitData={singleGraphSearchInitData}
                        />
                      );
                    }}
                  />
                </ActionPanel>
              )
            }
          />
        );
      })}
    </List>
  );
}
