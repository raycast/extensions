import { Action, ActionPanel, Icon, List, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getReadPublicToken, getApiBaseUrl, getAuthBaseUrl } from "./oauth";

interface SearchResult {
  orcidId: string;
  givenNames: string;
  familyName: string;
  institution: string | null;
}

interface ExpandedSearchResponse {
  "expanded-result"?: Array<{
    "orcid-id": string;
    "given-names"?: string;
    "family-names"?: string;
    "institution-name"?: string[];
  }>;
}

function sanitizeWord(word: string): string {
  // Remove special characters that may cause issues with Lucene query syntax
  return word.replace(/[.,:;!?'"()[\]{}]/g, "");
}

function buildSearchQuery(query: string): string {
  const words = query
    .trim()
    .split(/\s+/)
    .map(sanitizeWord)
    .filter((w) => w.length > 0);
  if (words.length === 0) return "";

  if (words.length === 1) {
    return `(given-names:${words[0]}* OR family-name:${words[0]}*)`;
  }

  // Last word is family name, rest are given names
  const givenWords = words.slice(0, -1);
  const familyWord = words[words.length - 1];

  // Search given names with OR (handles middle names/initials)
  const givenQuery = givenWords.map((w) => `given-names:${w}*`).join(" OR ");
  return `((${givenQuery}) AND family-name:${familyWord}*)`;
}

async function searchOrcid(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const token = await getReadPublicToken();
  const searchQuery = buildSearchQuery(query);

  const response = await fetch(
    `${getApiBaseUrl()}/expanded-search/?q=${encodeURIComponent(searchQuery)}&rows=20`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status}`);
  }

  const data = (await response.json()) as ExpandedSearchResponse;

  return (data["expanded-result"] ?? []).map((item) => ({
    orcidId: item["orcid-id"],
    givenNames: item["given-names"] ?? "",
    familyName: item["family-names"] ?? "",
    institution: item["institution-name"]?.[0] ?? null,
  }));
}

export default function Command() {
  const [query, setQuery] = useState("");

  const { data: results, isLoading } = useCachedPromise(searchOrcid, [query], {
    keepPreviousData: true,
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search by name..."
      onSearchTextChange={setQuery}
      throttle
    >
      {(results ?? []).map((result) => (
        <List.Item
          key={result.orcidId}
          title={
            `${result.givenNames} ${result.familyName}`.trim() || "Unknown"
          }
          subtitle={result.orcidId}
          accessories={result.institution ? [{ text: result.institution }] : []}
          actions={
            <ActionPanel>
              <Action
                title="Open Profile"
                icon={Icon.Globe}
                onAction={() => open(`${getAuthBaseUrl()}/${result.orcidId}`)}
              />
              <Action.CopyToClipboard
                title="Copy Orcid"
                content={result.orcidId}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Name"
                content={`${result.givenNames} ${result.familyName}`.trim()}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
