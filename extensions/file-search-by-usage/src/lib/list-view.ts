/**
 * What the result list shows.
 *
 * Extracted from the render because the branch was wrong three times: once
 * falling through to nothing while a query was in flight, once rendering a
 * section with no rows in it, and once withholding rows for stages that do not
 * change them. Each was a blank screen with no message, and each was invisible
 * in a 1,300-line component.
 *
 * As one pure function it is exhaustively testable, and `chooseListView`
 * returning a kind for every input is what makes a blank screen impossible
 * rather than merely unlikely.
 */

export type ListViewState = {
  /** False only until the usage history has loaded. */
  rankingReady: boolean;
  /** How many rows will actually render. Not how many are held. */
  visibleRows: number;
  /** This view is being replaced, so its rows belong to the old scope. */
  leaving: boolean;
  /** A stage is still running, so the rows are held rather than shown. */
  computing: boolean;
  /** A folder listing is still being read. */
  directoryPending: boolean;
  /** The typed text is below the index minimum. */
  tooShort: boolean;
  minQuery: number;
  query: string;
  folderError?: string;
  locationError?: string;
  searchError?: string;
  /** A collection limit was reached, so coverage is partial. */
  limitReached: boolean;
  /** No index has been built, or it could not be read. */
  noIndex: boolean;
};

export type ListView =
  | { kind: "rows" }
  | { kind: "loading"; title: string; description: string }
  | {
      kind: "empty";
      title: string;
      description: string;
      hint: "keys" | "none";
    };

/**
 * Decide what to show, always.
 *
 * `rows` wins whenever anything will render, so a partially settled list is
 * shown rather than hidden: the alternative is a blank screen for as long as
 * the slowest source takes, which is several seconds for a folder's usage
 * metadata and is not worth trading a visible list for.
 */
export function chooseListView(state: ListViewState): ListView {
  if (!state.rankingReady)
    return {
      kind: "loading",
      title: "Loading your usage history…",
      description: "Nothing can be ranked until it is read.",
    };

  if (state.visibleRows > 0) return { kind: "rows" };

  const empty = (
    title: string,
    description: string,
    hint: "keys" | "none" = "none",
  ): ListView => ({ kind: "empty", title, description, hint });

  /*
   * Before the more specific reasons, because a view being replaced knows
   * nothing about why: its rows were dropped on the way out, so every reason
   * below it would be describing the scope the user just left.
   */
  if (state.leaving) return empty("Opening…", "Loading what you selected.");
  if (state.directoryPending)
    return empty(
      "Reading folder…",
      "You can keep typing while the folder loads.",
    );
  if (state.folderError)
    return empty(
      "Folder could not be read",
      "Check that the folder still exists and that Raycast can access it.",
    );
  if (state.locationError)
    return empty(
      "Location could not be read",
      "Check that the location still exists and that Raycast can access it.",
    );
  if (state.searchError)
    return empty("Search failed", "Rebuild the search index, then try again.");
  /*
   * After the reasons that name a specific source, and before the reasons that
   * describe a finished list, because a list still being computed is not yet
   * short of results, over its limit, or missing a match.
   */
  if (state.computing)
    return {
      kind: "loading",
      title: "Ranking by usage…",
      description: "The list appears once every source has answered.",
    };
  if (state.tooShort)
    return empty(
      `Keep typing — ${state.minQuery} characters minimum`,
      `Memory results are here already; the index is asked at ${state.minQuery} characters.`,
      "keys",
    );
  if (state.limitReached)
    return empty(
      "Search limit reached",
      "Only part of this location was checked. Use a more specific query or search inside a folder.",
    );
  if (state.noIndex)
    return empty(
      "No search index yet",
      "Choose Rebuild Search Index in Actions to build one.",
    );
  if (state.query === "")
    return empty(
      "Nothing to show yet",
      "Type to search, or open a folder to list what is in it.",
    );
  return empty(
    `Nothing matching “${state.query}”`,
    "Try fewer words, or rebuild the index if the file is new.",
  );
}

/**
 * Whether the list shows its loading bar.
 *
 * Raycast withholds `List.EmptyView` while the list is loading, so a list that
 * is loading *and* empty shows nothing at all: no rows, no message, no reason
 * given. That is what every blank screen was, including the one on start,
 * where the usage history has not loaded and so `isLoading` is true by
 * definition.
 *
 * The bar therefore belongs only to a list that has rows, where it means "these
 * may still reorder". With no rows the empty view carries the same information
 * in words, and carrying it in words requires not being in a loading state.
 */
export function listIsLoading(view: ListView, settling: boolean): boolean {
  return view.kind === "rows" && settling;
}
