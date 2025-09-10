// GameDetail.tsx

import { Detail, ActionPanel, Action, useNavigation, showHUD, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { useLocalStorage } from "@raycast/utils";
import React from "react";
import { COMMON_COUNTRIES } from "./constants";
import { logBoth, getDefaultCountry, validateApiKey, getStorageKey } from "./utils";
import { ITADData, ITADDeal, ITADPrice, ITADDeveloper, ITADPlatform, ITADBundle } from "./types";

interface GameDetailProps {
  id: string;
  slug: string;
  focusStore?: string | null;
  focusPlatform?: string | null;
  country?: string;
}

export default function GameDetail({
  id,
  slug,
  focusStore = null,
  focusPlatform = null,
  country: propCountry,
}: GameDetailProps) {
  const { value: countryLS, setValue: setCountryLS } = useLocalStorage<string>(
    getStorageKey("COUNTRY"),
    getDefaultCountry(),
  );
  // Use the prop country if provided, otherwise fall back to local storage or preference
  const countryToUse = propCountry || countryLS || getDefaultCountry();
  const { push, pop } = useNavigation();
  const [data, setData] = useState<ITADData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentCountry, setCurrentCountry] = useState(countryToUse);

  // Update current country when countryToUse changes
  useEffect(() => {
    setCurrentCountry(countryToUse);
  }, [countryToUse]);

  useEffect(() => {
    async function fetchDetails() {
      // If this is a country change (not initial load), show refreshing state
      if (data.info && Object.keys(data.info).length > 0 && refreshTrigger > 0) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const { apiKey } = validateApiKey();

        // Fetch game info
        const infoUrl = `https://api.isthereanydeal.com/games/info/v2?key=${encodeURIComponent(apiKey)}&id=${encodeURIComponent(id)}`;
        const infoRes = await fetch(infoUrl);
        if (!infoRes.ok) {
          if (infoRes.status === 401 || infoRes.status === 403) {
            throw new Error("INVALID_API_KEY");
          }
        }
        const infoData = infoRes.ok ? await infoRes.json() : {};

        // Fetch prices using current country
        const pricesUrl = `https://api.isthereanydeal.com/games/prices/v3?key=${encodeURIComponent(apiKey)}&country=${encodeURIComponent(currentCountry)}`;
        let pricesData = { deals: [] };
        try {
          const pricesRes = await fetch(pricesUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify([id]),
          });
          if (pricesRes.ok) {
            const pricesDataRaw = await pricesRes.json();
            if (Array.isArray(pricesDataRaw)) {
              pricesData = pricesDataRaw.find((item) => item.id === id) || { deals: [] };
            } else if (pricesDataRaw && typeof pricesDataRaw === "object") {
              pricesData = pricesDataRaw[id] || { deals: [] };
            }
          }
        } catch (error) {
          showHUD("Could not fetch prices");
          logBoth("[GameDetail] Error fetching prices:", error);
        }

        // Fetch price history
        const historyUrl = `https://api.isthereanydeal.com/games/history/v2?key=${encodeURIComponent(apiKey)}`;
        let historyData = { list: [] };
        try {
          const historyRes = await fetch(historyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify([id]),
          });
          if (historyRes.ok) {
            const historyDataRaw = await historyRes.json();
            if (Array.isArray(historyDataRaw)) {
              historyData = historyDataRaw.find((item) => item.id === id) || { list: [] };
            } else if (historyDataRaw && typeof historyDataRaw === "object") {
              historyData = historyDataRaw[id] || { list: [] };
            }
          }
          logBoth("[GameDetail] historyData", historyData);
        } catch (error) {
          logBoth("[GameDetail] Error fetching history:", error);
        }

        // Fetch bundles
        const bundlesUrl = `https://api.isthereanydeal.com/games/bundles/v2?key=${encodeURIComponent(apiKey)}`;
        let bundlesData = { list: [] };
        try {
          const bundlesRes = await fetch(bundlesUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify([id]),
          });
          if (bundlesRes.ok) {
            const bundlesDataRaw = await bundlesRes.json();
            if (Array.isArray(bundlesDataRaw)) {
              bundlesData = bundlesDataRaw.find((item) => item.id === id) || { list: [] };
            } else if (bundlesDataRaw && typeof bundlesDataRaw === "object") {
              bundlesData = bundlesDataRaw[id] || { list: [] };
            }
          }
        } catch (error) {
          logBoth("[GameDetail] Error fetching bundles:", error);
        }

        setData({ info: infoData, prices: pricesData, history: historyData, bundles: bundlesData });
      } catch (error) {
        logBoth("[GameDetail] Error fetching details:", error);
        setData({});
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
    fetchDetails();
  }, [id, slug, currentCountry, refreshTrigger]);

  // Parse fields
  const info = data.info || {};
  const prices = data.prices || { deals: [] };
  const bundles = data.bundles || { list: [] };

  const title = info?.title || "Unknown Title";
  const image = info?.assets?.boxart || "";
  // Developers: handle array of strings or array of objects with .name
  let devs = "";
  if (Array.isArray(info?.developers)) {
    if (typeof info.developers[0] === "string") {
      devs = info.developers.join(", ");
    } else if (typeof info.developers[0] === "object" && info.developers[0]?.name) {
      devs = (info.developers as ITADDeveloper[]).map((d: ITADDeveloper) => d.name).join(", ");
    }
  } else {
    devs = info?.developers || "";
  }
  const releaseDate = info?.release_date || "";
  const review = info?.reviews?.score_desc || info?.reviews?.score || "";

  // ITAD link
  const itadUrl = info?.slug ? `https://isthereanydeal.com/game/${info.slug}/` : "";

  // All-time low from prices.historyLow.all and find store(s) for that price
  let allTimeLow: ITADPrice | null = null;
  let allTimeLowStores: string[] = [];
  if (prices?.historyLow?.all) {
    allTimeLow = prices.historyLow.all;
    if (Array.isArray(prices.deals) && allTimeLow) {
      allTimeLowStores = prices.deals
        .filter((deal: ITADDeal) => deal.storeLow?.amountInt === allTimeLow!.amountInt)
        .map((deal: ITADDeal) => deal.shop?.name)
        .filter((name): name is string => Boolean(name));
    }
  }
  // Current lowest price (across all stores)
  let currentLowest: ITADDeal | null = null;
  if (Array.isArray(prices?.deals) && prices.deals.length > 0) {
    currentLowest = prices.deals.reduce(
      (min: ITADDeal | null, d: ITADDeal) =>
        !min || (d.price?.amountInt || Infinity) < (min.price?.amountInt || Infinity) ? d : min,
      null,
    );
  }

  // Store and platform filtering
  const storeDeals = Array.isArray(prices?.deals) ? prices.deals : [];
  let filteredDeals: ITADDeal[] = [];
  if (focusStore) {
    filteredDeals = storeDeals.filter((deal: ITADDeal) => deal.shop?.name === focusStore);
  }
  if (focusPlatform) {
    filteredDeals = (filteredDeals.length > 0 ? filteredDeals : storeDeals).filter(
      (deal: ITADDeal) => deal.platforms && deal.platforms.some((p: ITADPlatform) => p.name === focusPlatform),
    );
  }

  // Get all unique platforms
  const allPlatforms = Array.from(
    new Set(
      storeDeals.flatMap((deal: ITADDeal) =>
        Array.isArray(deal.platforms) ? deal.platforms.map((p: ITADPlatform) => p.name) : [],
      ),
    ),
  ).filter(Boolean);

  // Bundles section
  let bundlesSection = "";
  if (bundles && Array.isArray(bundles?.list) && bundles.list.length > 0) {
    bundlesSection =
      `\n### Bundles\n` + bundles.list.map((b: ITADBundle) => `- **${b.title}** (${b.date || ""})`).join("\n");
  }

  // Markdown for image and title (title as plain text, not a link)
  const markdown = `# ${title}\n\n${image ? `![boxart](${image}?raycast-width=200)` : ""}`;

  // Find the deal for the current lowest price (for URL)
  let currentLowestUrl: string | null = null;
  if (currentLowest && Array.isArray(prices.deals)) {
    const match = prices.deals.find((deal: ITADDeal) => deal.price?.amountInt === currentLowest.price?.amountInt);
    if (match && match.url) currentLowestUrl = match.url;
  }
  // Find the deal for the all-time low price (for URL)
  let allTimeLowUrl: string | null = null;
  if (allTimeLow && Array.isArray(prices.deals)) {
    const match = prices.deals.find((deal: ITADDeal) => deal.storeLow?.amountInt === allTimeLow.amountInt && deal.url);
    if (match && match.url) allTimeLowUrl = match.url;
  }

  return (
    <Detail
      isLoading={isLoading || isRefreshing}
      markdown={
        (isRefreshing ? "🔄 **Refreshing prices for new country...**\n\n" : "") +
        markdown +
        (bundlesSection ? `\n${bundlesSection}` : "")
      }
      navigationTitle={title}
      metadata={
        <Detail.Metadata>
          {itadUrl && <Detail.Metadata.Link title="View on ITAD" target={itadUrl} text="IsThereAnyDeal.com" />}
          <Detail.Metadata.Label title="Country" text={currentCountry} />
          {devs && <Detail.Metadata.Label title="Developer" text={devs} />}
          {releaseDate && <Detail.Metadata.Label title="Release Date" text={releaseDate} />}
          {review && <Detail.Metadata.Label title="Review Score" text={review} />}
          {/* Group current and historical prices together, compact */}
          {(currentLowest || allTimeLow) && (
            <>
              {currentLowest &&
                (currentLowestUrl ? (
                  <Detail.Metadata.Link
                    title="Current Lowest"
                    target={currentLowestUrl}
                    text={`${Number(currentLowest.price?.amount).toFixed(2)} ${currentLowest.price?.currency} (${currentLowest.shop?.name || ""})`}
                  />
                ) : (
                  <Detail.Metadata.Label
                    title="Current Lowest"
                    text={`${Number(currentLowest.price?.amount).toFixed(2)} ${currentLowest.price?.currency} (${currentLowest.shop?.name || ""})`}
                  />
                ))}
              {allTimeLow &&
                (allTimeLowUrl ? (
                  <Detail.Metadata.Link
                    title="All Time Low"
                    target={allTimeLowUrl}
                    text={`${Number(allTimeLow.amount).toFixed(2)} ${allTimeLow.currency}${allTimeLowStores.length > 0 ? ` (${allTimeLowStores.join(", ")})` : ""}`}
                  />
                ) : (
                  <Detail.Metadata.Label
                    title="All Time Low"
                    text={`${Number(allTimeLow.amount).toFixed(2)} ${allTimeLow.currency}${allTimeLowStores.length > 0 ? ` (${allTimeLowStores.join(", ")})` : ""}`}
                  />
                ))}
            </>
          )}
          <Detail.Metadata.Separator />
          {filteredDeals.length > 0 &&
            filteredDeals.map((deal: ITADDeal, idx: number) => (
              <React.Fragment key={deal.shop?.name ? `${deal.shop?.name}-${idx}` : idx}>
                <Detail.Metadata.Label
                  title={deal.shop?.name || "Store"}
                  text={[
                    deal.platforms ? `Platforms: ${deal.platforms.map((p: ITADPlatform) => p.name).join(", ")}` : null,
                    deal.storeLow?.amount ? `Store Low: ${deal.storeLow.amount} ${deal.storeLow.currency}` : null,
                    deal.price?.amount ? `Current: ${deal.price.amount} ${deal.price.currency}` : null,
                    deal.storeLow?.amountInt != null && deal.price?.amountInt != null
                      ? `Better by: $${((deal.price.amountInt - deal.storeLow.amountInt) / 100).toFixed(2)}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" | ")}
                />
                <Detail.Metadata.Separator />
              </React.Fragment>
            ))}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Submenu title="Set Country/region" icon={Icon.Globe} shortcut={{ modifiers: ["cmd"], key: "t" }}>
            {COMMON_COUNTRIES.map((c) => (
              <Action
                key={c.code}
                title={`${c.name} (${c.code})`}
                onAction={async () => {
                  setCountryLS(c.code);
                  setCurrentCountry(c.code);
                  showHUD(`Country set to ${c.code}`);
                  // Force a re-fetch by incrementing the refresh trigger
                  setRefreshTrigger((prev) => prev + 1);
                }}
              />
            ))}
          </ActionPanel.Submenu>
          {!focusStore &&
            storeDeals.map((deal: ITADDeal) => (
              <Action
                key={deal.shop?.name}
                title={`View Only ${deal.shop?.name}`}
                onAction={() =>
                  push(<GameDetail id={id} slug={slug} focusStore={deal.shop?.name} country={currentCountry} />)
                }
              />
            ))}
          {!focusPlatform &&
            (allPlatforms as string[]).map((platform: string) => (
              <Action
                key={platform}
                title={`View Only ${platform}`}
                onAction={() =>
                  push(<GameDetail id={id} slug={slug} focusPlatform={platform} country={currentCountry} />)
                }
              />
            ))}
          {(focusStore || focusPlatform) && <Action title="Back to All" onAction={() => pop()} />}
          {filteredDeals.length === 1 && filteredDeals[0].url && (
            <Action.OpenInBrowser url={filteredDeals[0].url} title={`Open ${filteredDeals[0].shop?.name} Store Page`} />
          )}
        </ActionPanel>
      }
    />
  );
}
