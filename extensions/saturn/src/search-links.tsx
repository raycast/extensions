import { Icon, LaunchProps, List } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";
import { useMemo, useState } from "react";
import { LinkListItem } from "./lib/link-item";
import { useSaturnLibrary } from "./lib/saturn";
import { buildIndexFromLibrary, prepareIndex, searchLinks } from "./lib/search";

type SearchArguments = {
  query?: string;
};

/**
 * Search-only command — type to find bookmarks by title, tag, or page text.
 * Assign a global hotkey in Raycast Settings → Shortcuts to open from anywhere.
 */
export default function SearchLinks({
  arguments: launchArgs,
}: LaunchProps<{ arguments: SearchArguments }>) {
  const { library, index, pageTexts, isLoading } = useSaturnLibrary();
  const [searchText, setSearchText] = useState(launchArgs?.query ?? "");

  const collectionById = useMemo(
    () => new Map(library.collections.map((c) => [c.id, c] as const)),
    [library.collections],
  );

  const linksByCollection = useMemo(() => {
    const map = new Map<string, typeof library.links>();
    for (const link of library.links) {
      const bucket = map.get(link.collectionId) ?? [];
      bucket.push(link);
      map.set(link.collectionId, bucket);
    }
    return map;
  }, [library.links]);

  const { data: rankedLinks, visitItem } = useFrecencySorting(library.links, {
    key: (l) => l.id,
  });

  const prepared = useMemo(
    () =>
      prepareIndex(index ?? buildIndexFromLibrary(library.links, pageTexts)),
    [index, library.links, pageTexts],
  );

  const frecencyRank = useMemo(
    () => new Map(rankedLinks.map((l, i) => [l.id, i] as const)),
    [rankedLinks],
  );

  const query = searchText.trim();
  const results = useMemo(
    () =>
      query
        ? searchLinks({
            links: rankedLinks,
            index: prepared,
            pageTexts,
            query: searchText,
            frecencyRank,
          })
        : [],
    [query, rankedLinks, prepared, pageTexts, searchText, frecencyRank],
  );

  if (!isLoading && library.links.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No links saved yet"
          description="Saturn saves links when you capture with ⌘⇧S. Once you've saved one, it'll show up here."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      isShowingDetail={results.length > 0}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search titles, tags, and page text…"
    >
      {!query ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search your bookmarks"
          description="Type to search titles, tags, and page text across your Saturn library."
        />
      ) : results.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No matches"
          description="Try a different search term."
        />
      ) : (
        results.map((result) => {
          const collection = collectionById.get(result.link.collectionId);
          const collectionLinks = linksByCollection.get(
            result.link.collectionId,
          );
          return (
            <LinkListItem
              key={result.link.id}
              link={result.link}
              collection={collection}
              collectionLinks={collectionLinks}
              match={result}
              onVisit={visitItem}
            />
          );
        })
      )}
    </List>
  );
}
