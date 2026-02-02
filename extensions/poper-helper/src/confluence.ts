import { getPreferenceValues } from "@raycast/api";
import { Preferences, getJiraCredentials } from "./utils";

export interface ConfluencePage {
  title: string;
  url: string;
  author: string;
}

interface ConfluenceSearchResult {
  title: string;
  _links: {
    webui: string;
  };
  history?: {
    createdBy?: {
      displayName: string;
    };
  };
}

/**
 * Searches Confluence pages using CQL (Confluence Query Language).
 * Returns pages matching the text query, including title, URL, and author.
 *
 * @param query - The search string
 * @returns Array of ConfluencePage objects
 */
export async function searchConfluence(query: string): Promise<ConfluencePage[]> {
  const preferences = getPreferenceValues<Preferences>();
  const { confluenceLimit } = preferences;

  const creds = getJiraCredentials(preferences);
  if (!creds) {
    throw new Error("Missing configuration");
  }
  const { baseUrl, headers } = creds;

  const cql = `text ~ "${query}"`;
  const params = new URLSearchParams({
    cql,
    limit: confluenceLimit || "10",
    expand: "history.createdBy",
  });

  const apiUrl = `${baseUrl}/wiki/rest/api/content/search?${params.toString()}`;

  const response = await fetch(apiUrl, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new Error(`Confluence API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { results: ConfluenceSearchResult[] };

  return data.results.map((result) => {
    let webui = result._links?.webui || "";
    if (webui.startsWith("/")) {
      webui = webui.substring(1);
    }
    return {
      title: result.title,
      url: `${baseUrl}/wiki/${webui}`,
      author: result.history?.createdBy?.displayName || "Unknown",
    };
  });
}
