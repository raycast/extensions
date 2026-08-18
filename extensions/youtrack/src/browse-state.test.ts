import { getBrowseEmptyViewState } from "./browse-state";

const emptyState = {
  hasSearchText: true,
  isLoading: false,
  issueCount: 0,
  suggestionCount: 0,
};

describe("getBrowseEmptyViewState", () => {
  test("should surface issue failures with a retry target", () => {
    expect(
      getBrowseEmptyViewState({
        ...emptyState,
        issuesError: new Error("Authentication failed"),
      }),
    ).toEqual({
      title: "Failed to Load Issues",
      description: "Authentication failed",
      retry: "issues",
    });
  });

  test("should surface suggestion failures when no results are available", () => {
    expect(
      getBrowseEmptyViewState({
        ...emptyState,
        suggestionsError: new Error("Suggestions unavailable"),
      }),
    ).toEqual({
      title: "Failed to Load Search Suggestions",
      description: "Suggestions unavailable",
      retry: "suggestions",
    });
  });

  test("should keep suggestion failures nonfatal when issues are available", () => {
    expect(
      getBrowseEmptyViewState({
        ...emptyState,
        issueCount: 1,
        suggestionsError: new Error("Suggestions unavailable"),
      }),
    ).toBeNull();
  });

  test("should ignore a stale suggestion failure after search text is cleared", () => {
    expect(
      getBrowseEmptyViewState({
        ...emptyState,
        hasSearchText: false,
        suggestionsError: new Error("Suggestions unavailable"),
      }),
    ).toEqual({
      title: "No Issues Found",
      description: "No issues match your configured query.",
    });
  });

  test("should reserve the no-results message for successful empty responses", () => {
    expect(getBrowseEmptyViewState(emptyState)).toEqual({
      title: "No Issues Found",
      description: "Try another YouTrack search query.",
    });
  });
});
