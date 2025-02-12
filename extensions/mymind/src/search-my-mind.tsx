import { List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { fetchMyMindCards } from "./utils";
import { useCachedPromise } from "@raycast/utils";
import { getFavicon } from "@raycast/utils";
import { CardActions } from "./components/CardAction";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const {
    isLoading,
    data: cards,
    revalidate,
  } = useCachedPromise(
    async () => {
      try {
        return await fetchMyMindCards();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch cards",
          message: String(error),
        });
        return {};
      }
    },
    [],
    {
      keepPreviousData: true,
    },
  );

  // Filter cards based on search text and tags
  const filteredCards = Object.entries(cards || {}).filter(
    ([_, card]) =>
      card.title?.toLowerCase().includes(searchText.toLowerCase()) ||
      card.description?.toLowerCase().includes(searchText.toLowerCase()) ||
      card.tags?.some((tag) => tag.content.toLowerCase().includes(searchText.toLowerCase())),
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search your mind cards..."
      throttle
    >
      {filteredCards.map(([_, card]) => (
        <List.Item
          key={card.slug}
          icon={card.source?.url ? getFavicon(card.source.url) : "../assets/mymind-logo.svg"}
          title={card.title || "Untitled"}
          subtitle={card.description}
          accessories={[{ date: new Date(card.modified) }]}
          actions={<CardActions card={card} />}
        />
      ))}
    </List>
  );
}
