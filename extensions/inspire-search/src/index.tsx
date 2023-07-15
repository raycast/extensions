import { useState, useEffect } from "react";
import { Action, ActionPanel, Clipboard, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { selectUrl } from "./utils";
import ItemComponent from "./ItemComponent";
import ViewDetails from "./ViewDetails";

const API_PATH =
  "https://inspirehep.net/api/literature?fields=titles,collaborations,authors.full_name,earliest_date,citation_count,arxiv_eprints,publication_info,number_of_pages,abstracts,keywords,document_type,dois,imprints&size=9";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [startingPage, setStartingPage] = useState(1);
  const [searchMemory, _setSearchMemory] = useState<{ query: string; page: number }[]>([]);
  const [clipboardMemory, setClipboardMemory] = useState("");
  const [bibtexUrl, setBibtexUrl] = useState("");
  const [clipboardFlag, setClipboardFlag] = useState(false);
  const [sortBy, setSortBy] = useState(`${getPreferenceValues().sort}`);

  const { isLoading, data } = useFetch(`${API_PATH}&sort=${sortBy}&page=${pageNumber}&q=${searchText}`, {
    execute: !!searchText,
    parseResponse: (response) => response.json(),
    keepPreviousData: true,
    onError: (error: Error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Cannot load results",
      });
    },
  });

  useFetch(bibtexUrl, {
    execute: !!bibtexUrl,
    parseResponse: (response) => response.text(),
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
    onError: (error: Error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Not Found",
      });
    },
  });

  function memorizePreviousSearch() {
    searchMemory.push({ query: searchText, page: pageNumber });
  }

  function showCitations(item: any) {
    return () => {
      memorizePreviousSearch();
      setSearchText(`refersto:recid:${item.id}`);
    };
  }

  function showReferences(item: any) {
    return () => {
      memorizePreviousSearch();
      setSearchText(`citedby:recid:${item.id}`);
    };
  }

  function goBack() {
    const previousSearch: { query: string; page: number } | undefined = searchMemory.pop();
    if (previousSearch) {
      setStartingPage(previousSearch.page);
      setSearchText(previousSearch.query);
    }
  }

  function listActions(item: any) {
    return (
      <ActionPanel title="Inspire HEP Search">
        <Action.Push
          title="View Details"
          shortcut={{ modifiers: [], key: "enter" }}
          icon={Icon.List}
          target={<ViewDetails item={item} />}
        />
        <Action.OpenInBrowser url={selectUrl(item)} shortcut={{ modifiers: ["cmd"], key: "enter" }} icon={Icon.Globe} />
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
        <ActionPanel.Section title="Navigation">
          <Action
            title="Next Page"
            shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
            icon={Icon.ChevronRight}
            onAction={() => {
              if (pageNumber < Math.ceil(data.hits.total / 9)) {
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
      </ActionPanel>
    );
  }

  useEffect(() => {
    setPageNumber(startingPage);
    setStartingPage(1);
  }, [searchText]);

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
        (item: any, index: number) => (
          <ItemComponent key={item.id} item={item} index={index} page={pageNumber} itemActions={listActions(item)} />
        )
      )}
    </List>
  );
}
