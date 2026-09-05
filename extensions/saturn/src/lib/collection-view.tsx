import { List } from "@raycast/api";
import { SaturnCollection, SaturnLink } from "./saturn";
import { LinkListItem } from "./link-item";

interface CollectionLinksViewProps {
  collection: SaturnCollection;
  links: SaturnLink[];
  isLoading?: boolean;
  onVisitLink?: (link: SaturnLink) => void;
}

/** The links inside a single collection — pushed onto the nav stack from Browse Collections. */
export function CollectionLinksView({
  collection,
  links,
  isLoading,
  onVisitLink,
}: CollectionLinksViewProps) {
  return (
    <List
      navigationTitle={collection.name}
      isLoading={isLoading}
      searchBarPlaceholder={`Search ${collection.name}`}
    >
      {links.length === 0 ? (
        <List.EmptyView
          title="No links yet"
          description={`Nothing saved to "${collection.name}" yet. Capture a link in Saturn with ⌘⇧S.`}
        />
      ) : (
        links.map((link) => (
          <LinkListItem
            key={link.id}
            link={link}
            collection={collection}
            collectionLinks={links}
            onVisit={onVisitLink}
          />
        ))
      )}
    </List>
  );
}
