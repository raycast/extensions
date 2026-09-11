import { useState } from "react";
import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";

const BASE = "https://webglossary.info";

/**
 * Turn free-text input into a WebGlossary slug.
 * "Google Developer Expert" -> "google-developer-expert"
 * The site's /terms/ paths only resolve for the exact hyphenated slug —
 * %20-encoded spaces are unreliable (work for some terms, 404 for others),
 * so we normalize here in code, which a Quicklink can't do.
 */
function toSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** True when the final URL is the exact /terms/{slug} page, not a homepage redirect. */
function isTermPageUrl(url: string, slug: string): boolean {
  try {
    const pathname = new URL(url).pathname.replace(/\/$/, "");
    return pathname === `/terms/${slug}`;
  } catch {
    return false;
  }
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const query = searchText.trim();
  const slug = toSlug(query);

  const termUrl = `${BASE}/terms/${slug}/`;
  const searchUrl = `${BASE}/search/${encodeURIComponent(query)}`;

  // Probe whether the term page actually exists before we make it the primary
  // action. This relies on the site returning a real non-200 (or redirecting
  // away) for unknown slugs. If WebGlossary ever serves a "soft 404" (200 body
  // that says not-found), tighten this by inspecting the response text instead.
  const { data: termExists, isLoading } = useFetch<boolean, false>(termUrl, {
    method: "HEAD",
    execute: slug.length > 0,
    parseResponse: async (response) => response.ok && isTermPageUrl(response.url, slug),
    keepPreviousData: true,
    initialData: false,
  });

  const definitionAction = <Action.OpenInBrowser title="Open Definition" url={termUrl} icon={Icon.Book} />;
  const searchAction = <Action.OpenInBrowser title="Search WebGlossary" url={searchUrl} icon={Icon.MagnifyingGlass} />;
  const copyAction = <Action.CopyToClipboard title="Copy Definition URL" content={termUrl} />;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search WebGlossary.info…"
      throttle
    >
      {query.length === 0 ? (
        <List.EmptyView
          icon={Icon.Book}
          title="Search WebGlossary.info"
          description="Type a term, e.g. “google developer expert”, to open its definition."
        />
      ) : termExists ? (
        // Found: opening the definition is the top, default action.
        <>
          <List.Item
            icon={Icon.Book}
            title={slug}
            subtitle="Open definition"
            accessories={[{ icon: Icon.Check, text: "Found" }]}
            actions={
              <ActionPanel>
                {definitionAction}
                {searchAction}
                {copyAction}
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.MagnifyingGlass}
            title={`Search for “${query}”`}
            subtitle="All matching terms"
            actions={
              <ActionPanel>
                {searchAction}
                {definitionAction}
              </ActionPanel>
            }
          />
        </>
      ) : (
        // Not found (or still resolving): search is the safe default, but you
        // can still force-open the guessed definition page.
        <List.Item
          icon={Icon.MagnifyingGlass}
          title={`Search for “${query}”`}
          subtitle="No exact term match — search all terms"
          actions={
            <ActionPanel>
              {searchAction}
              <Action.OpenInBrowser title="Open Definition Anyway" url={termUrl} icon={Icon.Book} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
