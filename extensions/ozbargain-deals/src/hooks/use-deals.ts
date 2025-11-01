import { useState, useEffect, useCallback } from "react";
import { showFailureToast } from "@raycast/utils";
import * as xml2js from "xml2js";
import sanitizeHtml from "sanitize-html";
import he from "he";

import { OzBargainFeedItem, Deal } from "../utils/types";
import { OZB_FEED_URL, sanitizeOptions } from "../utils/constants";
import { turndownService, extractStoreFromTitle } from "../utils/helpers";

export function useDeals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>("");

  const itemLimit = 20;

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(OZB_FEED_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.text();

      const parser = new xml2js.Parser({
        explicitArray: false,
        mergeAttrs: false,
        ignoreAttrs: false,
      });
      const result = await parser.parseStringPromise(data);

      const items: OzBargainFeedItem[] = Array.isArray(result?.rss?.channel?.item)
        ? result.rss.channel.item
        : result?.rss?.channel?.item
          ? [result.rss.channel.item]
          : [];

      const parsedDeals: Deal[] = items.slice(0, itemLimit).map((item, index) => {
        const descriptionHtml = sanitizeHtml(item.description || "", sanitizeOptions);
        const descriptionMarkdown = turndownService.turndown(descriptionHtml);

        const ozbMeta = item["ozb:meta"];
        const upvotes = parseInt(ozbMeta?.$?.["votes-pos"] || "0");
        const downvotes = parseInt(ozbMeta?.$?.["votes-neg"] || "0");
        const comments = parseInt(ozbMeta?.$?.["comment-count"] || "0");

        const store = extractStoreFromTitle(item.title);

        const rawCategories = item.category ? (Array.isArray(item.category) ? item.category : [item.category]) : [];
        const categories = rawCategories.filter((cat) => typeof cat === "string");

        const imageUrl = ozbMeta?.$?.image || item["media:thumbnail"]?.$?.url;

        return {
          id: item.guid || item.link || `deal-${index}`,
          title: he.decode(item.title),
          link: item.link,
          descriptionHtml: descriptionHtml,
          descriptionMarkdown: descriptionMarkdown,
          upvotes: upvotes,
          downvotes: downvotes,
          comments: comments,
          store: store,
          creator: item["dc:creator"] || "Anonymous",
          pubDate: new Date(item.pubDate),
          categories: categories,
          imageUrl: imageUrl,
          netVotes: upvotes - downvotes,
        };
      });
      setDeals(parsedDeals);
    } catch (err: unknown) {
      console.error("Failed to fetch OzBargain deals:", err);
      setError("Failed to load deals. Please check your internet connection or try again later.");
      showFailureToast(err, { title: "Failed to Load Deals" });
    } finally {
      setLoading(false);
    }
  }, [itemLimit]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const filteredDeals = deals.filter((deal) => {
    if (!searchText) return true;
    const lowerSearchText = searchText.toLowerCase();
    return (
      deal.title.toLowerCase().includes(lowerSearchText) ||
      deal.store.toLowerCase().includes(lowerSearchText) ||
      deal.categories.some((cat) => typeof cat === "string" && cat.toLowerCase().includes(lowerSearchText)) ||
      deal.descriptionMarkdown.toLowerCase().includes(lowerSearchText)
    );
  });

  return { deals: filteredDeals, loading, error, setSearchText };
}
