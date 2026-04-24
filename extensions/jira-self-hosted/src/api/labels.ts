import { request } from "./request";

type LabelSuggestion = {
  value: string;
};

type JqlSuggestionsResponse = {
  results: LabelSuggestion[];
};

function isJiraNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  try {
    const data = JSON.parse(error.message) as { "status-code"?: number };
    return data["status-code"] === 404;
  } catch {
    return false;
  }
}

/**
 * Label suggestions from JQL autocomplete (Jira Server/DC: no reliable GET /rest/api/2/label).
 * Requires Jira 9+ in line with the rest of this extension.
 */
export async function getLabels() {
  try {
    const response = await request<JqlSuggestionsResponse>("/jql/autocompletedata/suggestions", {
      params: { fieldName: "labels" },
    });
    const values =
      response?.results?.map((r) => r.value).filter((v): v is string => typeof v === "string" && v.length > 0) ?? [];
    return [...new Set(values)];
  } catch (error) {
    if (isJiraNotFoundError(error)) {
      return [];
    }
    throw error;
  }
}
