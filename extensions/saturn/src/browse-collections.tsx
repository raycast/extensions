import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { getFavicon, useFrecencySorting } from "@raycast/utils";
import { useMemo } from "react";
import { CollectionLinksView } from "./lib/collection-view";
import {
  SaturnCollection,
  SaturnLink,
  sortCollections,
  useSaturnLibrary,
} from "./lib/saturn";

function collectionListIcon(
  collection: SaturnCollection,
  links: SaturnLink[],
): Image.ImageLike {
  const fallback = collection.isInbox ? Icon.Tray : Icon.Folder;
  const withUrl = links.find((l) => {
    try {
      return Boolean(new URL(l.url).hostname);
    } catch {
      return false;
    }
  });
  if (withUrl) {
    try {
      return getFavicon(withUrl.url, {
        fallback,
        mask: Image.Mask.RoundedRectangle,
      });
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export default function BrowseCollections() {
  const { library, isLoading } = useSaturnLibrary();

  const collections = useMemo(
    () => sortCollections(library.collections),
    [library.collections],
  );

  // Most-opened/most-recently-opened links float to the top of each collection.
  const { data: rankedLinks, visitItem } = useFrecencySorting(library.links, {
    key: (l) => l.id,
  });

  const linksByCollection = useMemo(() => {
    const map = new Map<string, SaturnLink[]>();
    for (const link of rankedLinks) {
      const bucket = map.get(link.collectionId) ?? [];
      bucket.push(link);
      map.set(link.collectionId, bucket);
    }
    return map;
  }, [rankedLinks]);

  if (!isLoading && collections.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Tray}
          title="Saturn hasn't captured anything yet"
          description="Open Saturn and press ⌘⇧S to save your first link, then come back here."
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search collections">
      {collections.map((collection) => {
        const links = linksByCollection.get(collection.id) ?? [];
        const count = links.length;
        return (
          <List.Item
            key={collection.id}
            icon={collectionListIcon(collection, links)}
            title={collection.name}
            accessories={[{ text: `${count} link${count === 1 ? "" : "s"}` }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Open Collection"
                  icon={Icon.ArrowRight}
                  target={
                    <CollectionLinksView
                      collection={collection}
                      links={links}
                      onVisitLink={visitItem}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
