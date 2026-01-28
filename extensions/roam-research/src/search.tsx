import { List, Icon, ActionPanel, Action, confirmAlert, Alert, useNavigation, getPreferenceValues } from "@raycast/api";
import { useEvent, useGraphsConfig } from "./utils";
import { debounce } from "debounce";
import { SingleGraphSearchView, searchSingleGraphMinimal, MinimalSearchResult } from "./components";
import { keys, values } from "./utils";
import { useEffect, useState } from "react";
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

// defining this outside because the fn was getting recreated all the time defeating the purpose of the debounce
const changeResult = debounce((text: string, setSearchText: (text: string) => any) => {
  text = text.trim();
  if (!text || text.length < 2) {
    return;
  }
  // console.log("setSearchText", text);
  setSearchText(text);
}, 500);

export default function Command() {
  // TODO: I feel the code in this command is not that good (is hard to understand and change)
  //   Do a proper refactoring of this later
  const { graphsConfig } = useGraphsConfig();
  // console.log("graphsConfig.values()", values(graphsConfig))
  const [graphNames, setGraphNames] = useState<string[]>([]);

  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();

  // data shown in the search text box
  const [textData, setTextData] = useState<string>("");
  // data which is textData but after debouncing
  const [searchText, setSearchText] = useState("");

  const {
    isLoading,
    data,
  }: // error
  // revalidate
  // mutate
  {
    isLoading: boolean;
    data: GraphsMinimalResultsOrErrorMessageMap;
  } = useCachedPromise(
    (graphsConfig, query: string) => {
      // return Promise.resolve(undefined);
      if (!graphsConfig || keys(graphsConfig).length === 0) {
        return Promise.resolve(undefined);
      }
      return Promise.allSettled(
        values(graphsConfig).map(
          (graphConfig: any) =>
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
            // console.log("fulfilled:", graphName, minimalResults);
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
            // console.log("rejected:", result.reason);
            const [graphName, err] = result.reason as [string, Error];
            graphsResultsMap[graphName] = err.message;
          }
        }
        // console.log("graphsResultsMap", graphsResultsMap);
        return graphsResultsMap;
      });
    },
    [graphsConfig, searchText],
    { keepPreviousData: true }
  );

  useEffect(() => {
    const graphNames = keys(graphsConfig);
    // sort
    if (data) {
      graphNames.sort(function (a: GraphName, b: GraphName) {
        let da = data[a];
        let db = data[b];
        if (!da || isGraphResultsOrErrorMessageAnError(da)) {
          return 1;
        }
        if (!db || isGraphResultsOrErrorMessageAnError(db)) {
          return -1;
        }
        da = da as GraphResults;
        db = db as GraphResults;
        const aCounts = da["counts"][0] + da["counts"][1];
        const bCounts = db["counts"][0] + db["counts"][1];
        return bCounts - aCounts;
      });
    }
    // console.log("useEffect: graphNames", graphNames)
    setGraphNames(graphNames);
  }, [graphsConfig, data]);

  if (graphNames.length === 0) {
    return (
      <List>
        <List.EmptyView icon={Icon.Tray} title="Please add graph first" />
      </List>
    );
  }
  if (graphNames.length === 1) {
    const graphConfig = graphsConfig[graphNames[0]];
    return <SingleGraphSearchView graphConfig={graphConfig} />;
  }

  const getAccessories = (graphSearchDataOrError: GraphResultsOrErrorMessage | false) => {
    // let graphSearchDataOrError = (textData && textData.length >= 2 && searchText === textData.trim() && data && data[graphName]);
    // console.log("getAccessories", graphName, graphSearchDataOrError);
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

  // console.log("graphNames", graphNames);

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
            accessories={isLoading ? [] : getAccessories(graphSearchDataOrError)}
            actions={
              !isError && (
                <ActionPanel>
                  <Action
                    icon={Icon.MagnifyingGlass}
                    title="Search Graph"
                    onAction={() => {
                      const graphConfig = graphsConfig[graphName];
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
