import { List, ActionPanel, Action, Icon, Color, open } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { SteamApp } from "../types";
import { useAppDetails } from "../hooks/useAppDetails";
import { usePlaytime } from "../hooks/usePlaytime";
import { formatPlaytime } from "../utils";
import { useIsWishlisted } from "../hooks/useWishlist";
import { fetchAppIcon } from "../api/steam";
import { getIconUrl, setIconUrl } from "../cache";
import { GameDetail } from "./GameDetail";

interface Props {
  app: SteamApp;
  isSelected: boolean;
}

export function GameItem({ app, isSelected }: Props) {
  const details = useAppDetails(app.id, isSelected);
  const playtime = usePlaytime(app.id);
  const isOwned = playtime !== null && playtime >= 0;
  const isWishlisted = useIsWishlisted(app.id);

  const [iconUrl, setIconUrlState] = useState<string | null>(
    () => getIconUrl(app.id) ?? null,
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (getIconUrl(app.id)) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    fetchAppIcon(app.id, controller.signal).then((url) => {
      if (url && !controller.signal.aborted) {
        setIconUrl(app.id, url);
        setIconUrlState(url);
      }
    });
    return () => controller.abort();
  }, [app.id]);

  return (
    <List.Item
      id={String(app.id)}
      icon={{ source: iconUrl ?? details?.iconUrl ?? app.tiny_image }}
      title={app.name}
      accessories={[
        ...(isSelected
          ? [
              {
                icon: { source: Icon.Person, tintColor: Color.Red },
                text: {
                  value: details?.currentPlayers ?? "…",
                  color: Color.SecondaryText,
                },
                tooltip: "Current players",
              },
              { text: { value: "·", color: Color.SecondaryText } },
              {
                text: {
                  value: details?.rating ?? "…",
                  color: details?.ratingColor ?? Color.SecondaryText,
                },
                tooltip: "Review score",
              },
              { text: { value: "·", color: Color.SecondaryText } },
              { text: details?.price ?? "…", tooltip: "Steam price" },
              ...(details?.ggPrice
                ? [
                    { text: { value: "·", color: Color.SecondaryText } },
                    {
                      icon: { source: "ggdeals.png" },
                      text: { value: details.ggPrice, color: Color.Green },
                      tooltip: "Lowest keyshop price on GG.deals",
                    },
                  ]
                : []),
            ]
          : []),
        ...(isOwned
          ? [
              {
                tag: { value: formatPlaytime(playtime!), color: Color.Blue },
                icon: Icon.GameController,
                tooltip: "Playtime",
              },
            ]
          : isWishlisted
            ? [{ tag: { value: "Wishlisted", color: Color.Purple } }]
            : []),
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Open in Steam"
            icon={Icon.Desktop}
            onAction={() => open(`steam://store/${app.id}`)}
          />
          {isOwned && (
            <Action
              title="Open in Library"
              icon={Icon.Book}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "return" },
                Windows: { modifiers: ["ctrl"], key: "return" },
              }}
              onAction={() => open(`steam://nav/games/details/${app.id}`)}
            />
          )}
          <Action.Push
            title="View Details"
            icon={Icon.Info}
            target={<GameDetail appId={app.id} name={app.name} />}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "i" },
              Windows: { modifiers: ["ctrl"], key: "i" },
            }}
          />
          <Action.OpenInBrowser
            title="View on GG.deals"
            url={`https://gg.deals/steam/app/${app.id}/`}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "g" },
              Windows: { modifiers: ["ctrl"], key: "g" },
            }}
          />
          <Action.OpenInBrowser
            title="View on SteamDB"
            url={`https://steamdb.info/app/${app.id}/charts/`}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "d" },
              Windows: { modifiers: ["ctrl"], key: "d" },
            }}
          />
          <Action.OpenInBrowser
            title="View on ProtonDB"
            url={`https://www.protondb.com/app/${app.id}`}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "p" },
              Windows: { modifiers: ["ctrl"], key: "p" },
            }}
          />
          {(details?.peakToday || details?.peakAllTime) && (
            <ActionPanel.Section title="Player Stats">
              {details?.peakToday && (
                <Action
                  // eslint-disable-next-line @raycast/prefer-title-case
                  title={`24h Peak: ${details.peakToday}`}
                  icon={Icon.BarChart}
                  onAction={() => open(`https://steamcharts.com/app/${app.id}`)}
                />
              )}
              {details?.peakAllTime && (
                <Action
                  title={`All-Time Peak: ${details.peakAllTime}`}
                  icon={Icon.BarChart}
                  onAction={() => open(`https://steamcharts.com/app/${app.id}`)}
                />
              )}
            </ActionPanel.Section>
          )}
          <Action.CopyToClipboard
            title="Copy to Clipboard"
            content={`https://store.steampowered.com/app/${app.id}`}
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
