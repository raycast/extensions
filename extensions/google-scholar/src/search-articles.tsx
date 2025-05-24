import { FormComponent } from "./components/FormComponent"; // Import the new FormComponent

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
  wordOccurrence: string;
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

// Define the interface for search results
export interface SearchResult {
  title: string;
  link: string;
  authors: string;
  snippet: string;
  pdfLink?: string;
  publication?: string;
  year?: string;
  citationCount?: string;
}

// Function to construct the Google Scholar search URL
export function constructSearchUrl(params: SearchParams, start: number = 0): string {
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
  queryParams.append("start", start.toString()); // Pagination parameter

  if (params.sortBy === "date") {
    queryParams.append("scisbd", "1");
  } else {
    // Default to relevance, can also explicitly set scisbd=0 but it's default
    // queryParams.append("scisbd", "0");
  }

  return `${baseUrl}?${queryParams.toString()}`;
}

// Entry point of the extension (imports FormComponent)
export default function Command() {
  return <FormComponent />;
}
