import { useState, useEffect } from "react";
import { LocalStorage, showToast, Toast } from "@raycast/api";
import { Feed } from "../types";
import { STORAGE_KEY_FEEDS } from "../utils/constants";

export function useManageFeeds() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadFeeds() {
      try {
        const storedFeeds = await LocalStorage.getItem<string>(STORAGE_KEY_FEEDS);
        let parsedFeeds: Feed[] = [];

        if (storedFeeds) {
          try {
            parsedFeeds = JSON.parse(storedFeeds);
          } catch (error) {
            console.error("Failed to parse stored feeds:", error);
          }
        }

        if (parsedFeeds.length > 0) {
          setFeeds(parsedFeeds);
        } else {
          setFeeds([{ id: Date.now().toString(), name: "", url: "" }]);
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadFeeds();
  }, []);

  const handleAddFeed = () => {
    setFeeds([...feeds, { id: Date.now().toString(), name: "", url: "" }]);
  };

  const handleSubmit = async (values: Record<string, string>) => {
    const newFeeds = feeds
      .map((feed) => ({
        id: feed.id,
        name: values[`name_${feed.id}`]?.trim() || "",
        url: values[`url_${feed.id}`]?.trim() || "",
      }))
      .filter((feed) => feed.name !== "" && feed.url !== "");

    for (const feed of newFeeds) {
      try {
        new URL(feed.url);
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid RSS URL",
          message: feed.name,
        });
        return;
      }
    }

    try {
      await LocalStorage.setItem(STORAGE_KEY_FEEDS, JSON.stringify(newFeeds));
      await showToast({ style: Toast.Style.Success, title: "Feeds saved successfully!" });

      setFeeds(newFeeds.length > 0 ? newFeeds : [{ id: Date.now().toString(), name: "", url: "" }]);
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Error saving feeds." });
    }
  };

  return {
    feeds,
    isLoading,
    handleAddFeed,
    handleSubmit,
  };
}
