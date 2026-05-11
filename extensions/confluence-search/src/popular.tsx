import "cross-fetch/polyfill";

import { Color, Icon, Image, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { useAuthorizeSite } from "./util/hooks";
import { Content, fetchHydratedPopularFeed } from "./api/confluence";
import { SearchActions } from "./SearchResults";

export default function Command() {
  const site = useAuthorizeSite();
  const [popular, setPopular] = useState<Content[]>();

  useEffect(() => {
    (async () => {
      if (!site) {
        return;
      }
      const popularContent = await fetchHydratedPopularFeed(site);
      setPopular(popularContent);
    })();
  }, [site]);

  return (
    <List isLoading={!popular}>
      {popular?.map((content) => <PopularListItem key={content.id} content={content} />)}
    </List>
  );
}

function PopularListItem({ content }: { content: Content }) {
  const accessories = content.lastSeenAt
    ? [
        { icon: Icon.ChevronUp, text: String(content.likesCount), tooltip: `${content.likesCount} reactions` },
        { icon: Icon.Message, text: String(content.commentCount), tooltip: `${content.commentCount} comments` },
        {
          icon: { source: Icon.Checkmark, tintColor: Color.Green },
          tooltip: `Last viewed ${content.lastSeenAtFriendly}`,
        },
      ]
    : [
        { icon: Icon.ChevronUp, text: String(content.likesCount), tooltip: `${content.likesCount} reactions` },
        { icon: Icon.Message, text: String(content.commentCount), tooltip: `${content.commentCount} comments` },
        { icon: Icon.Circle, tooltip: "Haven't seen this yet" },
      ];

  return (
    <List.Item
      title={content.title}
      icon={{
        source: content.createdBy.profilePicture,
        mask: Image.Mask.Circle,
      }}
      subtitle={content.spaceTitle}
      accessories={accessories}
      actions={<SearchActions searchResult={content} />}
    />
  );
}
