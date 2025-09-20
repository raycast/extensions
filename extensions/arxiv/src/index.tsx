import { List, Icon, Color, LocalStorage, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useEffect } from "react";
import { URLSearchParams } from "node:url";
import { formatDistanceToNow } from "date-fns";
import { DiceCoefficient } from "natural/lib/natural/distance/index";
import { SearchResult, ArxivCategory, ArxivCategoryColour, SearchListItemProps } from "./types";
import { parseResponse } from "./utils";
import { getCitation, CitationStyle, CITATION_STYLES, DEFAULT_CITATION_STYLE } from "./citations";
import { ARXIV_API_BASE_URL, MAX_SEARCH_RESULTS, MIN_SEARCH_LENGTH, CITATION_STYLE_STORAGE_KEY } from "./constants";
import { SearchListItemActions } from "./components/SearchListItemActions";
import { buildAccessories } from "./components/SearchListItemAccessories";

const DEFAULT_TEXT = "";

interface Preferences {
  accessoryDisplay: "timeAgo" | "publicationInfo";
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useState(ArxivCategory.All);
  const [citationStyle, setCitationStyle] = useState<CitationStyle>(DEFAULT_CITATION_STYLE);

  useEffect(() => {
    LocalStorage.getItem<string>(CITATION_STYLE_STORAGE_KEY).then((storedStyle) => {
      if (storedStyle && isValidCitationStyle(storedStyle)) {
        setCitationStyle(storedStyle as CitationStyle);
      }
    });
  }, []);

  const handleSetCitationStyle = async (style: CitationStyle) => {
    setCitationStyle(style);
    await LocalStorage.setItem(CITATION_STYLE_STORAGE_KEY, style);
  };

  // Load data from arXiv API
  // Note: useFetch from @raycast/utils already includes built-in caching and memoization.
  // Additional caching would be redundant since users typically search for different terms.
  const { data, isLoading, error } = useFetch(
    ARXIV_API_BASE_URL + "?" + constructSearchQuery(searchText, MAX_SEARCH_RESULTS),
    {
      parseResponse: parseResponse,
      execute: searchText.length >= MIN_SEARCH_LENGTH,
      onError: (err) => {
        console.error("Search error:", err);
        // Error toast is already shown by parseResponse
      },
    }
  );

  // Sort and filter data based on search text and category
  // Performance Note: This filtering/sorting is intentionally NOT memoized because:
  // 1. It only runs when data, searchText, or category changes (all intentional re-renders)
  // 2. The computation is lightweight for MAX_RESULTS=30 items (~1ms)
  // 3. useMemo overhead would exceed the computation cost
  // 4. DiceCoefficient is only calculated once per item during sort, not repeatedly
  const filteredData = data
    ?.sort(compareSearchResults(searchText || DEFAULT_TEXT))
    ?.filter(
      ({ category: entryCategory }: SearchResult) =>
        category == "" || category === "phys" || entryCategory.includes(category)
    );

  const title = isLoading
    ? "Loading..."
    : error
    ? "Search failed - please try again"
    : searchText.length
    ? "No Results"
    : "Use the search bar above to get started";

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search arXiv papers by title, author, or abstract"
      throttle={true}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Category"
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
      <List.EmptyView icon={{ source: "../assets/arxiv-logo.png" }} title={title} />
      <List.Section title="Results" subtitle={filteredData?.length + ""}>
        {filteredData?.map((searchResult: SearchResult) =>
          constructSearchListItem(searchResult, citationStyle, handleSetCitationStyle, preferences.accessoryDisplay)
        )}
      </List.Section>
    </List>
  );
}

function SearchListItem({
  id,
  published,
  updated,
  title,
  summary,
  authors,
  category,
  first_category,
  pdf_link,
  abstract_url,
  tex_url,
  html_url,
  doi,
  comment,
  journal_ref,
  citationStyle,
  setCitationStyle,
  accessoryDisplay,
}: SearchListItemProps & {
  citationStyle: CitationStyle;
  setCitationStyle: (style: CitationStyle) => void | Promise<void>;
  accessoryDisplay: "timeAgo" | "publicationInfo";
}) {
  const date = new Date(published);
  const timeAgo = formatDistanceToNow(date, { addSuffix: true });

  const accessories = buildAccessories({
    accessoryDisplay,
    timeAgo,
    journalRef: journal_ref,
    comment,
  });

  const authorsString = authors && authors.length > 0 ? authors.join(", ") : "";
  const multipleAuthors = authors && authors.length > 1;
  const addToAuthor = multipleAuthors ? " et al." : "";
  const primaryAuthor = authors && authors.length > 0 ? authors[0] + addToAuthor : "Unknown";

  const year = date.getFullYear();

  const categoryColour = ArxivCategoryColour[
    first_category as keyof typeof ArxivCategoryColour
  ] as unknown as Color.ColorLike;

  // Generate citation for tooltip
  const paperData: SearchResult = {
    id: id,
    title: title,
    authors,
    published,
    updated,
    summary,
    category,
    link: pdf_link,
    abstractUrl: abstract_url,
    pdfUrl: pdf_link,
    texUrl: tex_url,
    htmlUrl: html_url,
    doi,
    comment,
    journalRef: journal_ref,
  };
  const citation = getCitation(paperData, citationStyle);

  // Combine citation with categories for tooltip
  const titleTooltip = citation + (category ? `\n\nCategories: ${category}` : "");

  return (
    <List.Item
      id={id}
      icon={{ source: Icon.Circle, tintColor: categoryColour }}
      title={{ value: title, tooltip: titleTooltip }}
      subtitle={{ value: `${primaryAuthor} (${year})`, tooltip: authorsString || undefined }}
      accessories={accessories}
      actions={
        <SearchListItemActions paper={paperData} citationStyle={citationStyle} setCitationStyle={setCitationStyle} />
      }
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

// Compare function for sorting search results by relevance to search text
// Performance Note: DiceCoefficient caching is NOT needed here because:
// - Each title is compared to the search text exactly once during Array.sort()
// - JavaScript's sort algorithm (typically Timsort) minimizes comparisons
// - For MAX_RESULTS=30, this is ~30 DiceCoefficient calculations total
// - Caching would add memory overhead and complexity for negligible benefit
function compareSearchResults(textToCompare: string) {
  return (a: SearchResult, b: SearchResult) => {
    const aTitle = a.title ? a.title[0] : "";
    const bTitle = b.title ? b.title[0] : "";

    const aTitleSimilarity = DiceCoefficient(aTitle, textToCompare);
    const bTitleSimiarlity = DiceCoefficient(bTitle, textToCompare);

    return bTitleSimiarlity - aTitleSimilarity;
  };
}

function constructSearchListItem(
  searchResult: SearchResult,
  citationStyle: CitationStyle,
  setCitationStyle: (style: CitationStyle) => void | Promise<void>,
  accessoryDisplay: "timeAgo" | "publicationInfo"
) {
  return (
    <SearchListItem
      key={searchResult.id || ""}
      id={searchResult.id || ""}
      published={searchResult.published}
      updated={searchResult.updated}
      title={searchResult.title || ""}
      summary={searchResult.summary}
      authors={searchResult.authors}
      category={searchResult.category ? searchResult.category : ""}
      first_category={searchResult.category ? searchResult.category.split(".")[0] : ""}
      pdf_link={searchResult.link || ""}
      abstract_url={searchResult.abstractUrl}
      tex_url={searchResult.texUrl}
      html_url={searchResult.htmlUrl}
      doi={searchResult.doi}
      comment={searchResult.comment}
      journal_ref={searchResult.journalRef}
      citationStyle={citationStyle}
      setCitationStyle={setCitationStyle}
      accessoryDisplay={accessoryDisplay}
    />
  );
}

function isValidCitationStyle(style: string): style is CitationStyle {
  const allStyles = Object.values(CITATION_STYLES).flatMap((styles) => styles.map((s) => s.id));
  return allStyles.includes(style as CitationStyle);
}
