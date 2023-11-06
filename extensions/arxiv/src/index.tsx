import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { URLSearchParams } from "node:url";
import { formatDistanceToNow } from "date-fns";
import natural from "natural";
import { SearchResult, ArxivCategory, ArxivCategoryColour, SearchListItemProps } from "./types";
import { parseResponse } from "./utils";

const DEFAULT_TEXT = "";
const MAX_RESULTS = 30;

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useState(ArxivCategory.All);

  // Load data from arXiv API
  const { data, isLoading } = useFetch(
    "http://export.arxiv.org/api/query?" + constructSearchQuery(searchText || DEFAULT_TEXT, MAX_RESULTS),
    {
      parseResponse: parseResponse,
      execute: searchText.length > 0,
    }
  );

  // Sort and filter data based on search text and category
  const filteredData = data
    ?.sort(compareSearchResults(searchText || DEFAULT_TEXT))
    ?.filter(
      ({ category: entryCategory }: SearchResult) =>
        category == "" || category === "phys" || entryCategory.includes(category)
    );

  const title = isLoading ? "Loading..." : searchText.length ? "No Results" : "Use the search bar above to get started";

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search arXiv papers by title, author, or abstract"
      throttle={true}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Page"
          defaultValue={ArxivCategory.All}
          storeValue
          onChange={(newValue) => setCategory(newValue as ArxivCategory)}
        >
          {Object.entries(ArxivCategory).map(([name, value]) => (
            <List.Dropdown.Item key={name} title={name} value={value} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView icon={{ source: "../assets/1arxiv-logo.png" }} title={title} />

      <List.Section title="Results" subtitle={filteredData?.length + ""}>
        {filteredData?.map((searchResult: SearchResult) => constructSearchListItem(searchResult))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ id, published, title, authors, category, first_category, pdf_link }: SearchListItemProps) {
  const date = new Date(published);
  const timeAgo = formatDistanceToNow(date, { addSuffix: true });
  const accessories = [{ tag: timeAgo }];

  const authorsString = authors ? authors.join(", ") : "";
  const multipleAuthors = authorsString.split(",").length > 1;
  const addToAuthor = multipleAuthors ? " et al." : "";
  const primaryAuthor = authorsString.split(",")[0] + addToAuthor;

  const categoryColour = ArxivCategoryColour[
    first_category as keyof typeof ArxivCategoryColour
  ] as unknown as Color.ColorLike;

  return (
    <List.Item
      id={id}
      icon={{ source: Icon.Circle, tintColor: categoryColour }}
      title={{ value: title, tooltip: category }}
      subtitle={primaryAuthor}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open PDF" url={pdf_link} icon={{ source: Icon.Link }} />
          <Action.CopyToClipboard title="Copy Link" content={pdf_link} icon={{ source: Icon.Redo }} />
        </ActionPanel>
      }
      accessories={accessories}
    />
  );
}

function constructSearchQuery(text: string, maxResults: number) {
  return new URLSearchParams({
    search_query: text,
    sortBy: "relevance",
    sortOrder: "descending",
    max_results: maxResults.toString(),
  });
}

function compareSearchResults(textToCompare: string) {
  return (a: SearchResult, b: SearchResult) => {
    const aTitle = a.title ? a.title[0] : "";
    const bTitle = b.title ? b.title[0] : "";

    const aTitleSimilarity = natural.DiceCoefficient(aTitle, textToCompare);
    const bTitleSimiarlity = natural.DiceCoefficient(bTitle, textToCompare);

    return bTitleSimiarlity - aTitleSimilarity;
  };
}

function constructSearchListItem(searchResult: SearchResult) {
  return (
    <SearchListItem
      key={searchResult.id ? searchResult.id : ""}
      id={searchResult.id ? searchResult.id[0] : ""}
      published={searchResult.published}
      title={searchResult.title ? searchResult.title[0] : ""}
      authors={searchResult.authors}
      category={searchResult.category ? searchResult.category : ""}
      first_category={searchResult.category ? searchResult.category.split(".")[0] : ""}
      pdf_link={searchResult.link || ""}
    />
  );
}
