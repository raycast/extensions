import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  Color,
  open,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getRatingColor, formatGGPrice, formatNum } from "../utils";
import { fetchSteamChartsData } from "../api/steam";

interface GameDetailData {
  name: string;
  shortDescription: string;
  headerImage: string;
  releaseDate: string;
  developers: string[];
  publishers: string[];
  genres: string[];
  metacriticScore: number | null;
  price: string;
  rating: string;
  ratingColor: Color;
  currentPlayers: string;
  peakToday: string | null;
  peakAllTime: string | null;
  ggPrice: string | null;
}

interface AppDetailsResponse {
  name?: string;
  short_description?: string;
  header_image?: string;
  release_date?: { date?: string };
  developers?: string[];
  publishers?: string[];
  genres?: { description: string }[];
  metacritic?: { score: number };
  is_free?: boolean;
  price_overview?: { final_formatted: string; discount_percent: number };
}

export function GameDetail({ appId, name }: { appId: number; name: string }) {
  const { region, ggDealsApiKey } = getPreferenceValues<Preferences>();
  const [data, setData] = useState<GameDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    (async () => {
      const [detailsRaw, playersRaw, reviewsRaw, charts] = await Promise.all([
        fetch(
          `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=${region}`,
          { signal },
        )
          .then(
            (r) =>
              r.json() as Promise<
                Record<number, { data?: AppDetailsResponse }>
              >,
          )
          .catch(() => null),
        fetch(
          `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`,
          { signal },
        )
          .then(
            (r) =>
              r.json() as Promise<{ response?: { player_count?: number } }>,
          )
          .catch(() => null),
        fetch(
          `https://store.steampowered.com/appreviews/${appId}?json=1&language=all&purchase_type=all`,
          { signal },
        )
          .then(
            (r) =>
              r.json() as Promise<{
                query_summary?: {
                  total_reviews?: number;
                  total_positive?: number;
                };
              }>,
          )
          .catch(() => null),
        fetchSteamChartsData(appId, signal),
      ]);

      if (signal.aborted) return;

      const appData = detailsRaw?.[appId]?.data;

      let price = "—";
      if (appData?.is_free) {
        price = "Free";
      } else if (appData?.price_overview) {
        const p = appData.price_overview;
        price =
          p.discount_percent > 0
            ? `${p.final_formatted} (−${p.discount_percent}%)`
            : p.final_formatted;
      }

      const current = playersRaw?.response?.player_count ?? 0;
      const currentPlayers = current > 0 ? formatNum(current) : "—";

      const summary = reviewsRaw?.query_summary;
      const totalReviews = summary?.total_reviews ?? 0;
      const totalPositive = summary?.total_positive ?? 0;
      let rating = "No reviews";
      let ratingColor: Color = Color.SecondaryText;
      if (totalReviews > 0) {
        const pct = Math.round((totalPositive / totalReviews) * 100);
        rating = `${pct}% (${formatNum(totalReviews)})`;
        ratingColor = getRatingColor(pct);
      }

      let ggPrice: string | null = null;
      if (ggDealsApiKey) {
        ggPrice = await fetch(
          `https://api.gg.deals/v1/prices/by-steam-app-id/?key=${ggDealsApiKey}&ids=${appId}&region=${region}`,
          { signal },
        )
          .then((r) => r.json())
          .then((d: unknown) => {
            const parsed = d as {
              data?: Record<string, { prices?: { currentKeyshops?: string } }>;
            };
            const game = parsed?.data?.[String(appId)];
            if (game?.prices) {
              const keyshop = parseFloat(game.prices.currentKeyshops ?? "");
              return !isNaN(keyshop) ? formatGGPrice(keyshop, region) : null;
            }
            return null;
          })
          .catch(() => null);
      }

      if (signal.aborted) return;

      setData({
        name: appData?.name ?? name,
        shortDescription: (appData?.short_description ?? "")
          .replace(/<[^>]*>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'"),
        headerImage: appData?.header_image ?? "",
        releaseDate: appData?.release_date?.date ?? "",
        developers: appData?.developers ?? [],
        publishers: appData?.publishers ?? [],
        genres: (appData?.genres ?? []).map((g) => g.description),
        metacriticScore: appData?.metacritic?.score ?? null,
        price,
        rating,
        ratingColor,
        currentPlayers,
        peakToday: charts?.peak24h ?? null,
        peakAllTime: charts?.peakAllTime ?? null,
        ggPrice,
      });
      setIsLoading(false);
    })();

    return () => controller.abort();
  }, [appId, region, ggDealsApiKey]);

  const markdown = data
    ? `!["${data.name.replace(/"/g, "")}"](${data.headerImage})\n\n${data.shortDescription}`
    : "";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        data ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Price" text={data.price} />
            {data.ggPrice && (
              <Detail.Metadata.Label
                title="GG.deals"
                text={data.ggPrice}
                icon={{ source: "ggdeals.png" }}
              />
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Review Score" text={data.rating} />
            <Detail.Metadata.Label
              title="Current Players"
              text={data.currentPlayers}
              icon={{ source: Icon.Person, tintColor: Color.Red }}
            />
            {data.peakToday && (
              <Detail.Metadata.Label title="24h Peak" text={data.peakToday} />
            )}
            {data.peakAllTime && (
              <Detail.Metadata.Label
                title="All-Time Peak"
                text={data.peakAllTime}
              />
            )}
            {data.metacriticScore !== null && (
              <Detail.Metadata.Label
                title="Metacritic"
                text={String(data.metacriticScore)}
              />
            )}
            <Detail.Metadata.Separator />
            {data.releaseDate ? (
              <Detail.Metadata.Label
                title="Release Date"
                text={data.releaseDate}
              />
            ) : null}
            {data.developers.length > 0 && (
              <Detail.Metadata.Label
                title="Developer"
                text={data.developers.join(", ")}
              />
            )}
            {data.publishers.length > 0 && (
              <Detail.Metadata.Label
                title="Publisher"
                text={data.publishers.join(", ")}
              />
            )}
            {data.genres.length > 0 && (
              <Detail.Metadata.TagList title="Genres">
                {data.genres.map((g) => (
                  <Detail.Metadata.TagList.Item key={g} text={g} />
                ))}
              </Detail.Metadata.TagList>
            )}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title="Open in Steam"
            icon={Icon.Desktop}
            onAction={() => open(`steam://store/${appId}`)}
          />
          <Action.OpenInBrowser
            title="View on GG.deals"
            url={`https://gg.deals/steam/app/${appId}/`}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "g" },
              Windows: { modifiers: ["ctrl"], key: "g" },
            }}
          />
          <Action.OpenInBrowser
            title="View on SteamDB"
            url={`https://steamdb.info/app/${appId}/`}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "d" },
              Windows: { modifiers: ["ctrl"], key: "d" },
            }}
          />
          <Action.OpenInBrowser
            title="View on ProtonDB"
            url={`https://www.protondb.com/app/${appId}`}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "p" },
              Windows: { modifiers: ["ctrl"], key: "p" },
            }}
          />
          <Action.CopyToClipboard
            title="Copy Store URL"
            content={`https://store.steampowered.com/app/${appId}`}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "c" },
              Windows: { modifiers: ["ctrl"], key: "c" },
            }}
          />
        </ActionPanel>
      }
    />
  );
}
