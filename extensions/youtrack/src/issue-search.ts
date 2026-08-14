import type { Issue } from "./interfaces";

type FetchIssues = (query: string, maxIssues: number) => Promise<Issue[]>;

const BAD_REQUEST_ERROR_MESSAGE = "Error: 400 Bad Request";

export async function fetchIssueSearchResults(
  query: string,
  maxIssues: number,
  suppressBadRequest: boolean,
  fetchIssues: FetchIssues,
): Promise<Issue[]> {
  try {
    return await fetchIssues(query, maxIssues);
  } catch (error) {
    // youtrack-client 0.5.3 discards the response status and exposes only this message.
    if (suppressBadRequest && error instanceof Error && error.message === BAD_REQUEST_ERROR_MESSAGE) {
      return [];
    }
    throw error;
  }
}
