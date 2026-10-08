import { useState, useEffect } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { abbreviateNames, displayCollaborations, selectUrl } from "./utils";
import ItemComponent from "./ItemComponent";
import type { InspireItem, InspireResponse } from "./types";

const API_PATH =
  "https://inspirehep.net/api/literature?fields=titles,collaborations,authors.full_name,earliest_date,citation_count,arxiv_eprints,publication_info,number_of_pages,abstracts,keywords,document_type,dois,imprints,external_system_identifiers&size=9";

type ListComponentProps = {
  isLoading: boolean;
  searchText: string;
  setSearchText: React.Dispatch<React.SetStateAction<string>>;
  data: InspireResponse | undefined;
  pageNumber: number;
  actions: (item: InspireItem, listView: boolean) => unknown;
  setSortBy: React.Dispatch<React.SetStateAction<string>>;
};

function ListView({ isLoading, searchText, setSearchText, data, pageNumber, actions, setSortBy }: ListComponentProps) {
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search InspireHEP..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort by"
          defaultValue={`${getPreferenceValues().sort}`}
          onChange={(newValue) => setSortBy(newValue)}
        >
          <List.Dropdown.Item
            key={0}
            title={data && searchText ? `Most recent of ${data.hits.total} results` : "Most recent"}
            value="mostrecent"
          />
          <List.Dropdown.Item
            key={1}
            title={data && searchText ? `Least recent of ${data.hits.total} results` : "Least recent"}
            value="leastrecent"
          />
          <List.Dropdown.Item
            key={2}
            title={data && searchText ? `Most cited of ${data.hits.total} results` : "Most cited"}
            value="mostcited"
          />
        </List.Dropdown>
      }
      throttle
    >
      {(searchText && data && data.hits && Array.isArray(data.hits.hits) ? data.hits.hits : []).map(
        (item: InspireItem, index: number) => (
          <ItemComponent
            key={item.id}
            item={item}
            index={index}
            page={pageNumber}
            itemActions={actions(item, true) as List.Item.Props["actions"]}
          />
        ),
      )}
    </List>
  );
}

type DetailComponentProps = {
  item: InspireItem;
  actions: (item: InspireItem, listView: boolean) => unknown;
};

function DetailView({ item, actions }: DetailComponentProps) {
  return (
    <Detail
      navigationTitle={item.metadata.titles[0].title}
      actions={actions(item, false) as Detail.Props["actions"]}
      markdown={
        item.metadata.document_type[0] === "book"
          ? `**Book Description** \n --- \n ${
              item.metadata.abstracts ? item.metadata.abstracts[0].value : "Not available."
            }`
          : `**Abstract** \n --- \n ${item.metadata.abstracts ? item.metadata.abstracts[0].value : "Not available."}`
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Authors"
            text={
              item.metadata.authors
                ? abbreviateNames(item.metadata.authors)
                : displayCollaborations(item.metadata.collaborations ?? [])
            }
          />
          {item.metadata.arxiv_eprints ? (
            <Detail.Metadata.Link
              title="ArXiv"
              target={`https://arxiv.org/pdf/${item.metadata.arxiv_eprints[0].value}`}
              text={item.metadata.arxiv_eprints[0].value}
            />
          ) : (
            <Detail.Metadata.Label title="Year" text={item.created.slice(0, 4)} />
          )}
          {item.metadata.publication_info &&
            item.metadata.publication_info[0].journal_title &&
            item.metadata.dois &&
            item.metadata.dois[0].value && (
              <Detail.Metadata.Link
                title="Journal"
                target={`https://doi.org/${item.metadata.dois[0].value}`}
                text={item.metadata.publication_info[0].journal_title}
              />
            )}
          {item.metadata.document_type &&
            item.metadata.document_type[0] === "book" &&
            item.metadata.imprints &&
            item.metadata.imprints[0].publisher &&
            item.metadata.dois &&
            item.metadata.dois[0].value && (
              <Detail.Metadata.Link
                title="Publisher"
                target={`https://doi.org/${item.metadata.dois[0].value}`}
                text={item.metadata.imprints[0].publisher}
              />
            )}
          {item.metadata.document_type &&
            item.metadata.document_type[0] === "book" &&
            item.metadata.imprints &&
            item.metadata.imprints[0].publisher &&
            !item.metadata.dois && (
              <Detail.Metadata.Label title="Publisher" text={item.metadata.imprints[0].publisher} />
            )}
          {item.metadata.number_of_pages && (
            <Detail.Metadata.Label title="Pages" text={`${item.metadata.number_of_pages}`} />
          )}
          {item.metadata.keywords && (
            <Detail.Metadata.TagList title="Keywords">
              {item.metadata.keywords.map((keyword, index: number) => (
                <Detail.Metadata.TagList.Item key={index} text={keyword.value} color="#FFFFFF" />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
    />
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [startingPage, setStartingPage] = useState(1);
  const [searchMemory, setSearchMemory] = useState<{ query: string; page: number }[]>([]);
  const [clipboardMemory, setClipboardMemory] = useState("");
  const [bibtexUrl, setBibtexUrl] = useState("");
  const [clipboardFlag, setClipboardFlag] = useState(false);
  const [sortBy, setSortBy] = useState(`${getPreferenceValues().sort}`);
  const { pop } = useNavigation();

  const { isLoading, data } = useFetch<InspireResponse>(
    `${API_PATH}&sort=${sortBy}&page=${pageNumber}&q=${searchText}`,
    {
      execute: !!searchText,
      parseResponse: async (response: unknown) =>
        (await (response as { json: () => Promise<unknown> }).json()) as InspireResponse,
      keepPreviousData: true,
      onError: () => {
        showToast({
          style: Toast.Style.Failure,
          title: "Cannot load results",
        });
      },
    },
  );

  const inspireData = data as InspireResponse | undefined;

  useFetch(bibtexUrl, {
    execute: !!bibtexUrl,
    parseResponse: (response: unknown) => (response as { text: () => Promise<string> }).text(),
    onWillExecute: () =>
      showToast({
        style: Toast.Style.Animated,
        title: "Downloading BibTeX Record",
      }),
    onData: (response: string) => {
      if (clipboardFlag) {
        Clipboard.copy(clipboardMemory + "\n" + response);
        setClipboardMemory(clipboardMemory + "\n" + response);
        showToast({
          style: Toast.Style.Success,
          title: "Added to Clipboard",
        });
      } else {
        Clipboard.copy(response);
        setClipboardMemory(response);
        showToast({
          style: Toast.Style.Success,
          title: "Copied to Clipboard",
        });
      }
    },
    onError: () => {
      showToast({
        style: Toast.Style.Failure,
        title: "Not Found",
      });
    },
  });

  function memorizePreviousSearch() {
    setSearchMemory((previousSearches) => [...previousSearches, { query: searchText, page: pageNumber }]);
  }

  function showCitations(item: InspireItem) {
    return () => {
      memorizePreviousSearch();
      setSearchText(`refersto:recid:${item.id}`);
    };
  }

  function showReferences(item: InspireItem) {
    return () => {
      memorizePreviousSearch();
      setSearchText(`citedby:recid:${item.id}`);
    };
  }

  function goBack() {
    setSearchMemory((previousSearches) => {
      const historyWithoutLastSearch = previousSearches.slice(0, -1);
      const previousSearch = previousSearches.at(-1);

      if (previousSearch) {
        setStartingPage(previousSearch.page);
        setSearchText(previousSearch.query);
      }

      return historyWithoutLastSearch;
    });
  }

  function actions(item: InspireItem, listView: boolean): unknown {
    return (
      <ActionPanel title="Inspire HEP Search">
        {listView && (
          <Action.Push
            title="View Details"
            shortcut={{ modifiers: [], key: "enter" }}
            icon={Icon.List}
            target={<DetailView item={item} actions={actions} />}
          />
        )}
        {!listView && (
          <Action title="Return to List" shortcut={{ modifiers: [], key: "enter" }} icon={Icon.Undo} onAction={pop} />
        )}
        <Action.OpenInBrowser url={selectUrl(item)} shortcut={{ modifiers: ["cmd"], key: "enter" }} icon={Icon.Globe} />
        <Action
          title="Copy BibTeX to Clipboard"
          shortcut={{ modifiers: ["cmd"], key: "b" }}
          icon={Icon.Clipboard}
          onAction={() => {
            setClipboardFlag(false);
            setBibtexUrl(item.links.bibtex);
          }}
        />
        <Action
          title="Add BibTeX to Clipboard"
          shortcut={{ modifiers: ["shift", "cmd"], key: "b" }}
          icon={Icon.Clipboard}
          onAction={() => {
            setClipboardFlag(true);
            setBibtexUrl(item.links.bibtex);
          }}
        />
        <Action.CopyToClipboard
          title="Copy URL to Clipboard"
          content={selectUrl(item)}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
          icon={Icon.Link}
        />
        {listView && (
          <ActionPanel.Section title="Navigation">
            <Action
              title="Next Page"
              shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
              icon={Icon.ChevronRight}
              onAction={() => {
                if (pageNumber < Math.ceil((inspireData?.hits?.total ?? 0) / 9)) {
                  setPageNumber(pageNumber + 1);
                }
              }}
            />
            <Action
              title="Previous Page"
              shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
              icon={Icon.ChevronLeft}
              onAction={() => {
                if (pageNumber > 1) {
                  setPageNumber(pageNumber - 1);
                }
              }}
            />
            <Action
              title="Show Citations"
              shortcut={{ modifiers: ["cmd"], key: "]" }}
              icon={Icon.ArrowRightCircle}
              onAction={showCitations(item)}
            />
            <Action
              title="Show References"
              shortcut={{ modifiers: ["cmd"], key: "[" }}
              icon={Icon.ArrowLeftCircle}
              onAction={showReferences(item)}
            />
            <Action
              title="Go Back"
              shortcut={{ modifiers: ["cmd"], key: "delete" }}
              icon={Icon.Undo}
              onAction={() => {
                if (searchMemory.length > 0) {
                  goBack();
                } else {
                  setSearchText("");
                }
              }}
            />
          </ActionPanel.Section>
        )}
      </ActionPanel>
    );
  }

  useEffect(() => {
    setPageNumber(startingPage);
    setStartingPage(1);
  }, [searchText]);

  return (
    <ListView
      isLoading={isLoading}
      searchText={searchText}
      setSearchText={setSearchText}
      data={inspireData}
      pageNumber={pageNumber}
      actions={actions}
      setSortBy={setSortBy}
    />
  );
}
