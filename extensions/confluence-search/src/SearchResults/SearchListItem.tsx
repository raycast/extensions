import { List, Icon, Color, Image } from "@raycast/api";
import { SearchResult } from "../api/confluence";

export function SearchListItem({ searchResult, actions }: { searchResult: SearchResult; actions: React.ReactNode }) {
  const accessories: List.Item.Accessory[] = [];

  if (searchResult.likes?.currentUser) {
    accessories.push({ icon: Icon.Heart, tooltip: `You have liked this` });
  }
  if (searchResult.favourite?.isFavourite) {
    accessories.push({
      icon: Icon.Star,
      tooltip: `You favourited this on ${searchResult.favourite.favouritedDate.toLocaleString()}`,
    });
  }

  const { lastSeenAt, modifiedAt, author } = searchResult;

  if (author) {
    accessories.push({
      icon: { source: author.profilePicture, mask: Image.Mask.Circle },
      tooltip: `Created by ${author.name}`,
    });
  }

  if (lastSeenAt) {
    const modifiedSinceLastSeen = modifiedAt && lastSeenAt < modifiedAt;
    const tooltip = modifiedSinceLastSeen
      ? `Changes since you last visited ${lastSeenAt.toLocaleString()}`
      : `Last seen ${lastSeenAt.toLocaleString()}`;

    accessories.push({
      icon: { source: Icon.Eye, tintColor: modifiedSinceLastSeen ? Color.Orange : undefined },
      tooltip,
    });
  }
  if (modifiedAt)
    accessories.push({
      date: modifiedAt,
      tooltip: `Last modified ${modifiedAt.toLocaleString()}`,
    });

  return (
    <List.Item
      title={searchResult.title}
      icon={searchResult.icon}
      subtitle={searchResult.space}
      accessories={accessories}
      // @ts-expect-error: To keep the original code
      actions={actions}
    />
  );
}

export default SearchListItem;
