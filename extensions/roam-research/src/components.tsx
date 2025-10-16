import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
// import { saveGraphAllBlocks } from "./cache";
import { initRoamBackendClient, BLOCK_QUERY, appendToPageOrDailyNote, getAllPagesCached } from "./roamApi";
import { useState } from "react";
import { debounce } from "debounce";
import { detailMarkdown, useEvent } from "./utils";
import { BlockDetail } from "./detail";
import { useCachedPromise, usePromise } from "@raycast/utils";
import * as roamApiSdk from "./roam-api-sdk-copy";

export interface MinimalSearchResult {
  ":block/uid": string;
  ":block/string"?: string;
  ":node/title"?: string;
}

export async function searchSingleGraphMinimal(graphConfig: GraphConfig, query: string, hideCodeBlocks?: boolean) {
  // console.log("searchSingleGraphMinimal", graphConfig.nameField, query)
  if (!query || query.length < 2) return undefined;

  const minimalSearchResults: MinimalSearchResult[] = await roamApiSdk.search(
    initRoamBackendClient(graphConfig.nameField, graphConfig.tokenField),
    query,
    hideCodeBlocks
  );
  // console.log('minimalSearchResults', JSON.stringify(minimalSearchResults));

  return minimalSearchResults;
}

export async function searchSingleGraphFull(
  graphConfig: GraphConfig,
  query: string,
  minimalSearchResults: MinimalSearchResult[] | undefined
) {
  if (!minimalSearchResults) return undefined;

  // TODO: this could probably be pulled out into a more general function
  const uidsList = minimalSearchResults.map((searchResult) => searchResult[":block/uid"]);

  // console.log("searchSingleGraph uidsList: ",  uidsList);

  const searchResultsReversePullBlocks: ReversePullBlock[] = await roamApiSdk.q(
    initRoamBackendClient(graphConfig.nameField, graphConfig.tokenField),
    `[ :find [(pull ?e [${BLOCK_QUERY}]) ...] :in $ [?block-uid ...] :where [?e :block/uid ?block-uid]]`,
    [uidsList]
  );

  const validSearchResultsReversePullBlocks: ReversePullBlock[] = searchResultsReversePullBlocks.filter(
    (block) => block[":node/title"] || block[":block/_children"]
  );

  const uidToReversePullBlocksMap: { [key: string]: ReversePullBlock } = {};

  for (const block of validSearchResultsReversePullBlocks) {
    uidToReversePullBlocksMap[block[":block/uid"]] = block;
  }

  // console.log("searchSingleGraphFull uidToReversePullBlocksMap: ",  JSON.stringify(uidToReversePullBlocksMap));

  return uidToReversePullBlocksMap;

  // // we need to show the results in the order returned by the `search` call
  // validSearchResultsReversePullBlocks.sort(function (a, b) {
  //   return uidsList.indexOf(a[":block/uid"]) - uidsList.indexOf(b[":block/uid"]);
  // });

  // // console.log("searchSingleGraph response: ", JSON.stringify(validSearchResultsReversePullBlocks));
  // return validSearchResultsReversePullBlocks;
}

interface SingleGraphSearchInitData {
  searchText: string;
  minimalSearchResults: MinimalSearchResult[];
}

// defining this outside because the fn was getting recreated all the time defeating the purpose of the debounce
const changeResult = debounce(
  (text: string, setSearchText: (text: string) => any, setDoExecuteSearch: (doExecute: boolean) => any) => {
    text = text.trim();
    if (!text || text.length < 2) {
      return;
    }
    // console.log("setSearchText", text);
    setSearchText(text);
    setDoExecuteSearch(true);
  },
  500
);

export const SingleGraphSearchView = ({
  graphConfig,
  title,
  singleGraphSearchInitData,
}: {
  graphConfig: GraphConfig;
  title?: string;
  singleGraphSearchInitData?: SingleGraphSearchInitData;
}) => {
  const isValidSingleGraphSearchInitData =
    singleGraphSearchInitData && singleGraphSearchInitData.searchText && singleGraphSearchInitData.minimalSearchResults;

  const startingText = isValidSingleGraphSearchInitData ? singleGraphSearchInitData.searchText : "";
  // data shown in the search text box
  const [textData, setTextData] = useState<string>(startingText);
  // data which is textData but after debouncing
  const [searchText, setSearchText] = useState<string>(startingText);

  const [doExecuteSearch, setDoExecuteSearch] = useState<boolean>(isValidSingleGraphSearchInitData ? false : true);

  const preferences = getPreferenceValues<Preferences>();

  const {
    isLoading: isMinimalSearchResultsLoading,
    data: minimalSearchResults,
    // error: minimalSearchResultsError,
    // revalidate: minimalSearchResultsRevalidate,
    // mutate: minimalSearchResultsMutate,
  } = useCachedPromise(
    (graphConfig: GraphConfig, query: string) =>
      searchSingleGraphMinimal(graphConfig, query, preferences.hideCodeBlocksInSearch),
    // TODO: alternatively could do something like (query === "" ? getLastUpdatedBlocksorPages() : searchBlocks(query))
    [graphConfig, searchText],
    {
      keepPreviousData: true,
      // so that it does not trigger the promise when we have `singleGraphSearchInitData`
      execute: doExecuteSearch,
      initialData: isValidSingleGraphSearchInitData && singleGraphSearchInitData?.minimalSearchResults,
    }
  );
  const {
    isLoading: isFullSearchResultsMapLoading,
    data: fullSearchResultsMap,
    // error,
    // revalidate,
    // mutate,
  } = useCachedPromise(
    (graphConfig: GraphConfig, query: string, minimalSearchResults: MinimalSearchResult[] | undefined) =>
      searchSingleGraphFull(graphConfig, query, minimalSearchResults),
    // alternatively could do something like (query === "" ? getLastUpdatedBlocksorPages() : searchBlocks(query))
    [graphConfig, searchText, minimalSearchResults],
    {
      keepPreviousData: true,
    }
  );
  const { push } = useNavigation();
  // console.log("loading: ", doExecuteSearch, isMinimalSearchResultsLoading, isFullSearchResultsMapLoading);
  return (
    <List
      navigationTitle={title || `Search graph ${graphConfig.nameField}`}
      isShowingDetail
      filtering={false}
      searchBarPlaceholder="At least two texts to filter"
      searchText={textData}
      onSearchTextChange={(text) => {
        setTextData(text);
        changeResult(text, setSearchText, setDoExecuteSearch);
      }}
      // TODO: somehow isMinimalSearchResultsLoading is true when execute:false is passed
      isLoading={(doExecuteSearch && isMinimalSearchResultsLoading) || isFullSearchResultsMapLoading}
    >
      {minimalSearchResults &&
        minimalSearchResults.map((block) => {
          // TODO: this loads the minimal block first and later the full block when that is done. Think about if that is required
          //   code would probably be much cleaner here if we did not have to do that
          const blockUid = block[":block/uid"];
          const gotFullSearchResults = !isFullSearchResultsMapLoading && fullSearchResultsMap;
          const toShow: boolean = gotFullSearchResults ? fullSearchResultsMap[blockUid] : true;
          const blockVal = gotFullSearchResults ? fullSearchResultsMap[blockUid] : block;
          return (
            toShow && (
              <List.Item
                key={blockUid}
                title={block[":node/title"] || ""}
                subtitle={block[":block/string"] || ""}
                icon={block[":node/title"] && Icon.List}
                detail={<List.Item.Detail markdown={detailMarkdown(blockVal, searchText)} />}
                actions={
                  gotFullSearchResults && (
                    <ActionPanel>
                      <Action
                        title="Quick look"
                        onAction={() => {
                          push(<BlockDetail block={blockVal} graphConfig={graphConfig} />);
                        }}
                      />
                    </ActionPanel>
                  )
                }
              />
            )
          );
        })}
    </List>
  );
};

export const SelectedBlocksSearchView = ({
  graphConfig,
  blocks,
  isLoading,
  showAllFirst,
  title,
}: {
  graphConfig: GraphConfig;
  blocks: ReversePullBlock[];
  isLoading?: boolean;
  showAllFirst?: boolean;
  title?: string;
}) => {
  const [filteredList, setFilteredList] = useState<ReversePullBlock[]>(showAllFirst ? blocks : []);
  const [filterQuery, setFilterQuery] = useState("");
  const changeResult = useEvent(
    debounce((text: string) => {
      text = text.trim();
      if (!text || text.length < 2) {
        return;
      }
      setFilterQuery(text);
      const keywords = text.split(" ");
      // console.log(keywords, "---");
      setFilteredList(
        blocks.filter((item) => {
          const s = item[":block/string"] || item[":node/title"] || "";
          return keywords.every((keyword) => s.includes(keyword));
        })
      );
    })
  );
  const { push } = useNavigation();
  return (
    <List
      navigationTitle={title || graphConfig.nameField}
      isShowingDetail
      filtering={false}
      searchBarPlaceholder="At least two texts to filter"
      onSearchTextChange={(text) => {
        changeResult(text);
      }}
      isLoading={isLoading}
    >
      {filteredList.map((block) => {
        return (
          <List.Item
            key={block[":block/uid"]}
            title={block[":block/string"] || block[":node/title"] || ""}
            detail={<List.Item.Detail markdown={detailMarkdown(block, filterQuery)} />}
            actions={
              <ActionPanel>
                <Action
                  title="Quick look"
                  onAction={() => {
                    push(<BlockDetail block={block} graphConfig={graphConfig} />);
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};

export const QuickCaptureDetail = ({ graphConfig }: { graphConfig: GraphConfig }) => {
  const { pop } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();

  // important thing to note is that these setters `setTemplate` and `setTagTodayDnp` do not change the preferences
  //   there is no programmatic way to do that - user would have to go to extension settings and change it there
  const [template, setTemplate] = useState<string>(preferences.quickCaptureTemplate);
  const [tagTodayDnp, setTagTodayDnp] = useState<boolean>(preferences.quickCaptureTagTodayDnp);

  const { isLoading: isGraphPagesLoading, data: graphPagesData } = usePromise(
    (graphConfig: GraphConfig) => getAllPagesCached(graphConfig),
    [graphConfig]
  );

  const [graphPageDropdownValue, setGraphPageDropdownValue] = useState<string>("");

  // console.log(template, " ----");
  return (
    <Form
      navigationTitle={`Quick Capture to ${graphConfig.nameField}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="ok"
            onSubmit={async (values) => {
              if (!values.content) {
                showToast({
                  title: `Content cann't be empty`,
                  style: Toast.Style.Failure,
                });
                return;
              }
              showToast({
                title: "uploading...",
                style: Toast.Style.Animated,
              });
              // values.graphPageDropdown="" means that we want to send to Daily Notes Page
              const isAppendToDailyNotesPage = !values.graphPageDropdown;
              const addTagToTodaysDnpOnTopBlock = !isAppendToDailyNotesPage && tagTodayDnp;
              const todayDnpPageTitle = roamApiSdk.dateToPageTitle(new Date());

              // TODO: maybe add options/multiselect/tag select to tag other pages too?
              // currently being used only for tagging today's daily note page on the basis of a checkbox (only when NOT sending the block to the DNP)
              const pageTitlesToTagTopBlockWith =
                addTagToTodaysDnpOnTopBlock && todayDnpPageTitle ? [todayDnpPageTitle] : [];
              appendToPageOrDailyNote(
                initRoamBackendClient(graphConfig.nameField, graphConfig.tokenField),
                values.content,
                values.template,
                values.date,
                pageTitlesToTagTopBlockWith,
                isAppendToDailyNotesPage ? undefined : values.graphPageDropdown
              ).then(
                () => {
                  showToast({
                    title: isAppendToDailyNotesPage
                      ? "Successfully added to daily note!"
                      : "Succesfully appended to page!",
                    style: Toast.Style.Success,
                  });
                  setTimeout(() => {
                    pop();
                  }, 500);
                },
                (e) => {
                  // TODO: handle 500 server errors with message to contact me/support
                  showToast({
                    title: "Failed to add to " + (isAppendToDailyNotesPage ? "daily note!" : "page!"),
                    style: Toast.Style.Failure,
                    message: e.message,
                  });
                }
              );
            }}
          />
          {
            // passing in no `page` opens daily notes page by default which is what we want here
            preferences.openIn === "web" ? (
              <Action.OpenInBrowser
                title="Open in browser"
                url={`https://roamresearch.com/#/app/${graphConfig.nameField}`}
              />
            ) : (
              <Action.Open title="Open in app" target={`roam://#/app/${graphConfig.nameField}`} />
            )
          }
          <Action.OpenInBrowser title="View date format" url="https://day.js.org/docs/en/parse/string-format" />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="Content" />
      <Form.Dropdown
        id="graphPageDropdown"
        title="Append to page"
        value={graphPageDropdownValue}
        onChange={setGraphPageDropdownValue}
      >
        <Form.Dropdown.Item key="dailyNotesPage" value="" title="Daily Notes Page (default)" />
        {!isGraphPagesLoading &&
          graphPagesData &&
          Object.entries(graphPagesData).map(([blockUid, nodeTitle]) => (
            <Form.Dropdown.Item key={blockUid} value={blockUid} title={nodeTitle} />
          ))}
      </Form.Dropdown>
      {graphPageDropdownValue && (
        <Form.Checkbox
          label="Tag today's Daily Note Page?"
          id="tagTodayDnpCheckbox"
          value={tagTodayDnp}
          onChange={setTagTodayDnp}
        />
      )}
      {/* <Form.DatePicker id="date" defaultValue={new Date()} type={Form.DatePicker.Type.DateTime} /> */}
      <Form.TextArea
        onChange={(template) => {
          setTemplate(template);
        }}
        id="template"
        title="Any changes to default template for this capture?"
        value={template}
      />
      <Form.Description
        title=""
        text={`Some useful variables: {date} for timestamp HH:mm 
                                      {content} for the content you pass
For template with multiple blocks, use a single space for indentation
(To change the template for all future captures, go to Extension Settings)
      `}
      />
    </Form>
  );
};
