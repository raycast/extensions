export interface BrowseEmptyViewState {
  title: string;
  description: string;
  retry?: "issues" | "suggestions";
}

interface BrowseEmptyViewInput {
  hasSearchText: boolean;
  isLoading: boolean;
  issueCount: number;
  suggestionCount: number;
  issuesError?: Error;
  suggestionsError?: Error;
}

export function getBrowseEmptyViewState(input: BrowseEmptyViewInput): BrowseEmptyViewState | null {
  if (input.isLoading || input.issueCount > 0 || input.suggestionCount > 0) {
    return null;
  }

  if (input.issuesError) {
    return {
      title: "Failed to Load Issues",
      description: input.issuesError.message,
      retry: "issues",
    };
  }

  if (input.hasSearchText && input.suggestionsError) {
    return {
      title: "Failed to Load Search Suggestions",
      description: input.suggestionsError.message,
      retry: "suggestions",
    };
  }

  return {
    title: "No Issues Found",
    description: input.hasSearchText ? "Try another YouTrack search query." : "No issues match your configured query.",
  };
}
