import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Form,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  List,
  popToRoot,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import {
  initRoamBackendClient,
  BLOCK_QUERY,
  CaptureError,
  getAllPagesCached,
  getUsedPages,
  addUsedPage,
} from "./roamApi";
import { captureWithOutbox } from "./outbox";
import { useEffect, useMemo, useState } from "react";
import { debounce } from "debounce";
import { detailMarkdown, useTemplatesConfig, BUILTIN_DEFAULT_TEMPLATE } from "./utils";
import { BlockDetail, OpenInRoamActions } from "./block-detail";
import { useCachedPromise, usePromise } from "@raycast/utils";
import * as roamApiSdk from "./roam-api-sdk-copy";

export const CUSTOM_PAGE_SENTINEL = "__SENTINEL_CUSTOM_PAGE_TITLE__";

export function resolvePageFromDropdown(
  dropdownValue: string,
  customTitle: string
): { page: string | undefined } | { error: string } {
  const isCustom = dropdownValue === CUSTOM_PAGE_SENTINEL;
  if (isCustom && !customTitle.trim()) {
    return { error: "Please enter a page name" };
  }
  const page = isCustom ? customTitle.trim() : dropdownValue || undefined;
  return { page };
}

export const useGraphPages = (graphConfig: GraphConfig) => {
  const canRead = graphConfig.capabilities?.read !== false;
  const { isLoading: isGraphPagesLoading, data: graphPagesData } = usePromise(
    (gc: GraphConfig) => getAllPagesCached(gc),
    [graphConfig],
    { execute: canRead }
  );
  const usedPages = getUsedPages(graphConfig.nameField);
  const usedPagesSet = new Set(usedPages);
  return { canRead, isGraphPagesLoading, graphPagesData, usedPages, usedPagesSet };
};

// Roam-style page search: NFD normalize + strip accents + lowercase
export const normalizeForSearch = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

// Tokenize query: split on whitespace, sort longest-first for early short-circuit
export const tokenizeQuery = (query: string) =>
  normalizeForSearch(query)
    .split(/\s+/)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

// Check if all tokens are substrings of the normalized title
export const matchesTokens = (normalizedTitle: string, tokens: string[]) =>
  tokens.length === 0 || tokens.every((token) => normalizedTitle.includes(token));

// Rank: 0 = exact match, 1 = starts-with full query, 2 = all-tokens match
export const rankMatch = (normalizedTitle: string, normalizedQuery: string): number => {
  if (normalizedTitle === normalizedQuery) return 0;
  if (normalizedQuery && normalizedTitle.startsWith(normalizedQuery)) return 1;
  return 2;
};

export const PageDropdown = ({
  value,
  onChange,
  customPageTitle,
  onCustomPageTitleChange,
  canRead,
  isGraphPagesLoading,
  graphPagesData,
  usedPages,
  usedPagesSet,
}: {
  value: string;
  onChange: (value: string) => void;
  customPageTitle: string;
  onCustomPageTitleChange: (value: string) => void;
  canRead: boolean;
  isGraphPagesLoading: boolean;
  graphPagesData?: Record<string, string>;
  usedPages: string[];
  usedPagesSet: Set<string>;
}) => {
  const showCustomField = value === CUSTOM_PAGE_SENTINEL;
  const [dropdownSearch, setDropdownSearch] = useState("");

  const tokens = tokenizeQuery(dropdownSearch);
  const normalizedQuery = normalizeForSearch(dropdownSearch);

  const filteredPages = useMemo(() => {
    if (!canRead || isGraphPagesLoading || !graphPagesData) return [];
    const matched = Object.entries(graphPagesData)
      .filter(([, nodeTitle]) => !usedPagesSet.has(nodeTitle))
      .filter(([, nodeTitle]) => matchesTokens(normalizeForSearch(nodeTitle), tokens));
    if (!dropdownSearch) return matched.slice(0, 100);
    // Rank and stable-sort (preserves edit-time order within each rank)
    return matched
      .map(([uid, title]) => [uid, title, rankMatch(normalizeForSearch(title), normalizedQuery)] as const)
      .sort((a, b) => a[2] - b[2])
      .slice(0, 100)
      .map(([uid, title]) => [uid, title] as [string, string]);
    // eslint-disable-next-line
  }, [canRead, isGraphPagesLoading, graphPagesData, usedPagesSet, tokens.join(" "), normalizedQuery]);

  const filteredUsedPages = useMemo(
    () => usedPages.filter((title) => matchesTokens(normalizeForSearch(title), tokens)),
    // eslint-disable-next-line
    [usedPages, tokens.join(" ")]
  );

  return (
    <>
      <Form.Dropdown
        id="graphPageDropdown"
        title="Append to page"
        value={value}
        onChange={onChange}
        filtering={false}
        onSearchTextChange={setDropdownSearch}
      >
        <Form.Dropdown.Item key="dailyNotesPage" value="" title="Daily Notes Page (default)" />
        {filteredUsedPages.length > 0 && (
          <Form.Dropdown.Section title="Recently Used">
            {filteredUsedPages.map((title) => (
              <Form.Dropdown.Item key={`used-${title}`} value={title} title={title} />
            ))}
          </Form.Dropdown.Section>
        )}
        {filteredPages.length > 0 && (
          <Form.Dropdown.Section title="All Pages">
            {filteredPages.map(([blockUid, nodeTitle]) => (
              <Form.Dropdown.Item key={blockUid} value={nodeTitle} title={nodeTitle} />
            ))}
          </Form.Dropdown.Section>
        )}
        <Form.Dropdown.Section>
          <Form.Dropdown.Item key="customPageTitle" value={CUSTOM_PAGE_SENTINEL} title="Type a page name..." />
        </Form.Dropdown.Section>
      </Form.Dropdown>
      {showCustomField && (
        <Form.TextField
          id="customPageTitleField"
          title="Page name"
          placeholder="Page title (creates if it doesn't exist)"
          value={customPageTitle}
          onChange={onCustomPageTitleChange}
        />
      )}
    </>
  );
};

export const GraphTagPicker = ({
  canRead,
  isGraphPagesLoading,
  graphPagesData,
  usedPages,
  usedPagesSet,
  value,
  onChange,
}: {
  canRead: boolean;
  isGraphPagesLoading: boolean;
  graphPagesData?: Record<string, string>;
  usedPages: string[];
  usedPagesSet: Set<string>;
  value: string[];
  onChange: (value: string[]) => void;
}) => {
  if (!canRead || isGraphPagesLoading || !graphPagesData) return null;
  return (
    <Form.TagPicker id="tags" title="Tags" value={value} onChange={onChange}>
      {usedPages.length > 0 &&
        usedPages.map((title) => <Form.TagPicker.Item key={`tag-used-${title}`} value={title} title={title} />)}
      {/* TODO: add dynamic search like PageDropdown instead of hard cap */}
      {Object.entries(graphPagesData)
        .filter(([, nodeTitle]) => !usedPagesSet.has(nodeTitle))
        .slice(0, 500)
        .map(([blockUid, nodeTitle]) => (
          <Form.TagPicker.Item key={`tag-${blockUid}`} value={nodeTitle} title={nodeTitle} />
        ))}
    </Form.TagPicker>
  );
};

export interface MinimalSearchResult {
  ":block/uid": string;
  ":block/string"?: string;
  ":node/title"?: string;
}

export async function searchSingleGraphMinimal(graphConfig: GraphConfig, query: string, hideCodeBlocks?: boolean) {
  if (!query || query.length < 2) return undefined;

  const minimalSearchResults: MinimalSearchResult[] = await roamApiSdk.search(
    initRoamBackendClient(graphConfig.nameField, graphConfig.tokenField),
    query,
    hideCodeBlocks
  );

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

  return uidToReversePullBlocksMap;
}

interface SingleGraphSearchInitData {
  searchText: string;
  minimalSearchResults: MinimalSearchResult[];
}

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

  const changeResult = useMemo(
    () =>
      debounce(
        (text: string, setSearchText: (text: string) => any, setDoExecuteSearch: (doExecute: boolean) => any) => {
          text = text.trim();
          if (!text || text.length < 2) {
            return;
          }
          setSearchText(text);
          setDoExecuteSearch(true);
        },
        500
      ),
    []
  );
  useEffect(() => () => changeResult.clear(), [changeResult]);

  const preferences = getPreferenceValues<Preferences>();

  const {
    isLoading: isMinimalSearchResultsLoading,
    data: minimalSearchResults,
    error: minimalSearchResultsError,
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
    error: fullSearchResultsError,
  } = useCachedPromise(
    (graphConfig: GraphConfig, query: string, minimalSearchResults: MinimalSearchResult[] | undefined) =>
      searchSingleGraphFull(graphConfig, query, minimalSearchResults),
    // alternatively could do something like (query === "" ? getLastUpdatedBlocksorPages() : searchBlocks(query))
    [graphConfig, searchText, minimalSearchResults],
    {
      keepPreviousData: true,
    }
  );
  const searchError = minimalSearchResultsError || fullSearchResultsError;
  useEffect(() => {
    if (searchError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Search failed",
        message: searchError instanceof Error ? searchError.message : String(searchError),
      });
    }
  }, [searchError]);

  const { push } = useNavigation();
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
          const toShow = gotFullSearchResults ? !!fullSearchResultsMap[blockUid] : true;
          const blockVal: ReversePullBlock = gotFullSearchResults
            ? fullSearchResultsMap[blockUid]
            : (block as unknown as ReversePullBlock); // Safe: phase-1 minimal result used only for display until full data loads
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
                        title="Quick Look"
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

export const CONTENT_TEMPLATE_HELP = `Variables: {content}, {time}, {today}, {tags}, {date:FORMAT}

Example templates:
  - {content}                                     Simple capture
  - {content} {tags}                              With tags
  - {time} {content} {tags}                       Timestamped (HH:mm)
  - {{[[TODO]]}} {content} {tags}                 TODO item
  - {today} {content}                             Links to today's daily note
  - from [[Raycast]] at {time}
    - {content}                                   Nested under header

{time} = current time (HH:mm). {today} = today's daily note page ref.
{date:FORMAT} is a legacy alias for custom date formatting (still supported).
Indent with 2 spaces per level for nested blocks.`;

/** Wrapper for "Quick Capture to graph" from GraphDetail. Picks a template, then shows the form. */
export const QuickCaptureFromGraph = ({ graphConfig }: { graphConfig: GraphConfig }) => {
  const { templatesConfig, isTemplatesConfigLoading } = useTemplatesConfig();
  const { push } = useNavigation();

  if (isTemplatesConfigLoading) {
    return <Detail isLoading={true} />;
  }

  // Relevant templates: universal + graph-specific matching this graph
  const hardcodedDefault: CaptureTemplate = { ...BUILTIN_DEFAULT_TEMPLATE, id: "__builtin__" };
  const allTemplates = templatesConfig.templates.length > 0 ? templatesConfig.templates : [hardcodedDefault];
  const relevant = allTemplates.filter((t) => !t.graphName || t.graphName === graphConfig.nameField);

  if (relevant.length <= 1) {
    // If no relevant templates (all are for other graphs), fall back to the universal hardcoded default
    return <QuickCaptureForm graphConfig={graphConfig} content="" template={relevant[0] || hardcodedDefault} />;
  }

  return (
    <List navigationTitle={`Select Template — ${graphConfig.nameField}`}>
      <List.Section title="Templates">
        {relevant.map((tmpl) => (
          <List.Item
            key={tmpl.id}
            title={tmpl.name}
            subtitle={tmpl.page || "Daily Notes Page"}
            accessories={[
              ...(tmpl.graphName
                ? [{ tag: { value: tmpl.graphName, color: Color.Purple } }]
                : [{ tag: { value: "All Graphs", color: Color.Blue } }]),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Select"
                  icon={Icon.ArrowRight}
                  onAction={() => push(<QuickCaptureForm graphConfig={graphConfig} content="" template={tmpl} />)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
};

export const QuickCaptureForm = ({
  graphConfig,
  content,
  template: templateProp,
}: {
  graphConfig: GraphConfig;
  content: string;
  template: CaptureTemplate;
}) => {
  const preferences = getPreferenceValues<Preferences>();
  const { canRead, isGraphPagesLoading, graphPagesData, usedPages, usedPagesSet } = useGraphPages(graphConfig);

  // Strip {tags} from displayed template when graph can't read (no TagPicker shown)
  const displayTemplate = (tmpl: string) => (!canRead ? tmpl.replace(/\s*\{tags\}/gi, "") : tmpl);

  // Form state — initialized from provided template
  const [templateStr, setTemplateStr] = useState<string>(displayTemplate(templateProp.contentTemplate));
  const [tagTodayDnp, setTagTodayDnp] = useState<boolean>(preferences.quickCaptureTagTodayDnp);
  const [graphPageDropdownValue, setGraphPageDropdownValue] = useState<string>(templateProp.page || "");
  const [customPageTitle, setCustomPageTitle] = useState<string>("");
  const [nestUnder, setNestUnder] = useState<string>(templateProp.nestUnder || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(templateProp.tags || []);

  if (graphConfig.capabilities?.append === false) {
    return (
      <Detail
        navigationTitle={`Quick Capture to ${graphConfig.nameField}`}
        markdown={`## Capture not available\n\nThe token for **${graphConfig.nameField}** does not have append permissions. Quick Capture requires a read+write or append-only token.\n\nTo fix this, remove the graph and re-add it with a token that has write access.`}
      />
    );
  }

  return (
    <Form
      navigationTitle={`Quick Capture to ${graphConfig.nameField}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="OK"
            onSubmit={async (values) => {
              if (!values.content) {
                showToast({ title: `Content can't be empty`, style: Toast.Style.Failure });
                return;
              }
              const resolved = resolvePageFromDropdown(values.graphPageDropdown, values.customPageTitleField || "");
              if ("error" in resolved) {
                showToast({ title: resolved.error, style: Toast.Style.Failure });
                return;
              }
              const selectedPageTitle = resolved.page;
              const isAppendToDailyNotesPage = !selectedPageTitle;

              showToast({ title: "uploading...", style: Toast.Style.Animated });

              const addTagToTodaysDnpOnTopBlock = !isAppendToDailyNotesPage && tagTodayDnp;
              const todayDnpPageTitle = roamApiSdk.dateToPageTitle(new Date());

              // Merge form tags (from TagPicker) + DNP tag (from checkbox)
              const formTags: string[] = canRead ? values.tags || [] : selectedTags;
              const dnpTags = addTagToTodaysDnpOnTopBlock && todayDnpPageTitle ? [todayDnpPageTitle] : [];
              const allTags = [...new Set([...formTags, ...dnpTags])];

              const result = await captureWithOutbox({
                graphName: graphConfig.nameField,
                token: graphConfig.tokenField,
                content: values.content,
                template: values.template,
                tags: allTags,
                page: selectedPageTitle,
                nestUnder: values.nestUnder || undefined,
                templateName: templateProp.name,
              });

              const gn = graphConfig.nameField;
              if (result.success) {
                if (selectedPageTitle) {
                  addUsedPage(gn, selectedPageTitle);
                }
                const title = isAppendToDailyNotesPage
                  ? `Added to daily note in ${gn}`
                  : `Appended to [[${selectedPageTitle}]] in ${gn}`;
                showToast({ title, style: Toast.Style.Success });
                setTimeout(() => popToRoot(), 500);
              } else if (result.error instanceof CaptureError && result.error.isRetryable) {
                showToast({
                  title: `Saved to outbox for ${gn}`,
                  message: "Will retry automatically",
                  style: Toast.Style.Failure,
                });
                setTimeout(() => popToRoot(), 500);
              } else {
                showToast({
                  title: "Failed to capture",
                  style: Toast.Style.Failure,
                  message: result.error?.message,
                });
              }
            }}
          />
          <OpenInRoamActions graphName={graphConfig.nameField} />
          <Action.OpenInBrowser title="View date format" url="https://day.js.org/docs/en/parse/string-format" />
          <Action
            title="Manage Templates"
            icon={Icon.Document}
            onAction={() => launchCommand({ name: "manage-templates", type: LaunchType.UserInitiated })}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="Content" defaultValue={content} />
      <Form.Description
        title=""
        text="Changes below are only for this capture. To change the template permanently, use 'Manage Capture Templates'."
      />
      <PageDropdown
        value={graphPageDropdownValue}
        onChange={setGraphPageDropdownValue}
        customPageTitle={customPageTitle}
        onCustomPageTitleChange={setCustomPageTitle}
        canRead={canRead}
        isGraphPagesLoading={isGraphPagesLoading}
        graphPagesData={graphPagesData}
        usedPages={usedPages}
        usedPagesSet={usedPagesSet}
      />
      <Form.TextField
        id="nestUnder"
        title="Nest under"
        placeholder="Optional: parent block to nest under"
        value={nestUnder}
        onChange={setNestUnder}
      />
      <GraphTagPicker
        canRead={canRead}
        isGraphPagesLoading={isGraphPagesLoading}
        graphPagesData={graphPagesData}
        usedPages={usedPages}
        usedPagesSet={usedPagesSet}
        value={selectedTags}
        onChange={setSelectedTags}
      />
      {((graphPageDropdownValue && graphPageDropdownValue !== CUSTOM_PAGE_SENTINEL) ||
        (graphPageDropdownValue === CUSTOM_PAGE_SENTINEL && customPageTitle.trim())) && (
        <Form.Checkbox
          label="Tag today's Daily Note Page?"
          id="tagTodayDnpCheckbox"
          value={tagTodayDnp}
          onChange={setTagTodayDnp}
        />
      )}
      <Form.TextArea onChange={setTemplateStr} id="template" title="Content template" value={templateStr} />
      <Form.Description title="" text={CONTENT_TEMPLATE_HELP} />
    </Form>
  );
};
