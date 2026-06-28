import { List, showToast, Toast, openExtensionPreferences } from "@raycast/api";
import { useState } from "react";
import { fetchMyMindCards } from "./utils";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
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
        // Check if error is related to authentication
        if (error instanceof Error && error.message.toLowerCase().includes("unauthorized")) {
          showToast({
            style: Toast.Style.Failure,
            title: "Authentication Required",
            message: "Please update your API token in extension preferences",
            primaryAction: {
              title: "Open Extension Preferences",
              onAction: () => {
                openExtensionPreferences();
              },
            },
          });
          return {};
        }

        showFailureToast({
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
    ([, card]) =>
      card.title?.toLowerCase().includes(searchText.toLowerCase()) ||
      card.description?.toLowerCase().includes(searchText.toLowerCase()) ||
      card.tags?.some((tag) => tag.name.toLowerCase().includes(searchText.toLowerCase())),
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search your mind cards..."
      throttle
    >
      {filteredCards.map(([, card]) => (
        <List.Item
          key={card.slug}
          icon={card.source?.url ? getFavicon(card.source.url) : "../assets/mymind-logo.svg"}
          title={card.title || "Untitled"}
          subtitle={card.description}
          accessories={[{ date: new Date(card.modified) }]}
          actions={<CardActions card={card} onDelete={revalidate} />}
        />
      ))}
    </List>
  );
}
