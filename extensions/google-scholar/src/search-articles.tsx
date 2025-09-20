import { ActionPanel, Action, Form, showToast, Toast, Icon, open } from "@raycast/api";
import { useState } from "react";
import { useCachedState } from "@raycast/utils";

// Define the interface for search parameters
export interface SearchParams {
  /** Words that must appear in the article. */
  allWords: string;
  /** An exact phrase that must appear in the article. */
  exactPhrase: string;
  /** At least one of these words must appear in the article. */
  atLeastOne: string;
  /** Words that must not appear in the article. */
  withoutWords: string;
  /** Where the words should occur (e.g., "title" or "any"). */
  wordOccurrence: "title" | "any";
  /** Authors of the article. */
  authors: string;
  /** The publication (journal, conference) the article appeared in. */
  publication: string;
  /** The starting year for the search range (e.g., "2020"). */
  startYear: string;
  /** The ending year for the search range (e.g., "2023"). */
  endYear: string;
  /** Sort order for results ("relevance" or "date"). Defaults to "relevance". */
  sortBy?: "relevance" | "date";
}

// Function to construct the Google Scholar search URL
export function constructSearchUrl(params: SearchParams): string {
  const baseUrl = "https://scholar.google.com/scholar";
  const queryParams = new URLSearchParams();

  if (params.allWords) queryParams.append("as_q", params.allWords);
  if (params.exactPhrase) queryParams.append("as_epq", params.exactPhrase);
  if (params.atLeastOne) queryParams.append("as_oq", params.atLeastOne);
  if (params.withoutWords) queryParams.append("as_eq", params.withoutWords);
  if (params.wordOccurrence === "title") queryParams.append("as_occt", "title");
  if (params.authors) queryParams.append("as_sauthors", params.authors);
  if (params.publication) queryParams.append("as_publication", params.publication);
  if (params.startYear) queryParams.append("as_ylo", params.startYear);
  if (params.endYear) queryParams.append("as_yhi", params.endYear);

  queryParams.append("hl", "en"); // Language set to English
  queryParams.append("as_sdt", "0%2C5"); // All article types

  if (params.sortBy === "date") {
    queryParams.append("scisbd", "1");
  } else {
    // Default to relevance
    queryParams.append("scisbd", "0");
  }

  return `${baseUrl}?${queryParams.toString()}`;
}

// Search Form Component
function SearchForm() {
  const [recentSearches, setRecentSearches] = useCachedState<SearchParams[]>("recent-searches", []);
  const [sortBy, setSortBy] = useState<string>("relevance");

  const handleSubmit = async (values: SearchParams) => {
    try {
      // Validate that at least one search field is filled
      const hasSearchTerms =
        values.allWords || values.exactPhrase || values.atLeastOne || values.authors || values.publication;

      if (!hasSearchTerms) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Please enter at least one search term",
        });
        return;
      }

      // Add to recent searches
      const newRecentSearches = [
        values,
        ...recentSearches.filter((s) => JSON.stringify(s) !== JSON.stringify(values)),
      ].slice(0, 10);
      setRecentSearches(newRecentSearches);

      // Construct and open the Google Scholar URL
      const searchUrl = constructSearchUrl(values);
      await open(searchUrl);

      await showToast({
        style: Toast.Style.Success,
        title: "Opening Google Scholar search in browser",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open search",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search in Browser" onSubmit={handleSubmit} icon={Icon.MagnifyingGlass} />
          <Action.OpenInBrowser
            title="Open Google Scholar"
            url="https://scholar.google.com"
            icon={Icon.Globe}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Search Google Scholar for academic articles and papers" />

      <Form.TextField
        id="allWords"
        title="All Words"
        placeholder="e.g., machine learning"
        info="Find articles that contain all of these words"
      />

      <Form.TextField
        id="exactPhrase"
        title="Exact Phrase"
        placeholder="e.g., deep learning"
        info="Find articles that contain this exact phrase"
      />

      <Form.TextField
        id="atLeastOne"
        title="At Least One Word"
        placeholder="e.g., neural network"
        info="Find articles that contain at least one of these words"
      />

      <Form.TextField
        id="withoutWords"
        title="Without Words"
        placeholder="e.g., survey"
        info="Exclude articles that contain these words"
      />

      <Form.Separator />

      <Form.Dropdown id="wordOccurrence" title="Where Words Occur" defaultValue="any">
        <Form.Dropdown.Item value="any" title="Anywhere in the article" />
        <Form.Dropdown.Item value="title" title="In the title of the article" />
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextField id="authors" title="Author" placeholder="e.g., John Doe" info="Find articles by this author" />

      <Form.TextField
        id="publication"
        title="Publication"
        placeholder="e.g., Nature, Science"
        info="Find articles published in this journal or venue"
      />

      <Form.Separator />

      <Form.Dropdown
        id="sortBy"
        title="Sort By"
        defaultValue="relevance"
        onChange={(value) => setSortBy(value || "relevance")}
      >
        <Form.Dropdown.Item value="relevance" title="Relevance" />
        <Form.Dropdown.Item value="date" title="Date (newest first)" />
      </Form.Dropdown>

      {sortBy === "relevance" && (
        <>
          <Form.Separator />
          <Form.Description text="Filter by publication year" />
          <Form.TextField id="startYear" title="From Year" placeholder="e.g., 2020" info="Earliest publication year" />

          <Form.TextField id="endYear" title="To Year" placeholder="e.g., 2023" info="Latest publication year" />
        </>
      )}

      {recentSearches.length > 0 && (
        <>
          <Form.Separator />
          <Form.Description text="Recent Searches" />
          {recentSearches.slice(0, 5).map((search, index) => {
            const searchText = search.allWords || search.exactPhrase || search.authors || "Search";
            return (
              <Form.Description
                key={index}
                text={`• ${searchText}${search.authors ? ` by ${search.authors}` : ""}${search.startYear ? ` (${search.startYear}${search.endYear ? `-${search.endYear}` : ""})` : ""}`}
              />
            );
          })}
        </>
      )}
    </Form>
  );
}

// Entry point of the extension
export default function Command() {
  return <SearchForm />;
}
