import { List, ActionPanel, Action, Icon, Color, open } from "@raycast/api";
import { SteamApp } from "../types";
import { useAppDetails } from "../hooks/useAppDetails";
import { useIsOwned } from "../hooks/useIsOwned";

interface Props {
  app: SteamApp;
  isSelected: boolean;
}

export function GameItem({ app, isSelected }: Props) {
  const details = useAppDetails(app.id, isSelected);
  const isOwned = useIsOwned(app.id);

  return (
    <List.Item
      id={String(app.id)}
      icon={{ source: details?.iconUrl ?? app.tiny_image }}
      title={app.name}
      accessories={[
        ...(isOwned ? [{ tag: { value: "Owned", color: Color.Green } }] : []),
        ...(isSelected
          ? [
              {
                text: {
                  value: details?.currentPlayers ?? "…",
                  color: Color.SecondaryText,
                },
                tooltip: "Current players",
              },
              ...(details?.peakToday
                ? [
                    {
                      text: {
                        value: `⬆ ${details.peakToday}`,
                        color: Color.SecondaryText,
                      },
                      tooltip: "24h peak",
                    },
                  ]
                : []),
              {
                text: {
                  value: details?.rating ?? "…",
                  color: details?.ratingColor ?? Color.SecondaryText,
                },
                tooltip: "Review score",
              },
              { text: details?.price ?? "…", tooltip: "Steam price" },
              ...(details?.ggPrice
                ? [
                    {
                      text: { value: details.ggPrice, color: Color.Yellow },
                      tooltip: "Lowest keyshop price on GG.deals",
                    },
                  ]
                : []),
            ]
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
          <Action.OpenInBrowser
            // eslint-disable-next-line @raycast/prefer-title-case
            title="View on GG.deals"
            url={`https://gg.deals/steam/app/${app.id}/`}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "g" },
              Windows: { modifiers: ["ctrl"], key: "g" },
            }}
          />
          <Action.OpenInBrowser
            // eslint-disable-next-line @raycast/prefer-title-case
            title="View on SteamDB"
            url={`https://steamdb.info/app/${app.id}/charts/`}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "d" },
              Windows: { modifiers: ["ctrl"], key: "d" },
            }}
          />
          {details?.peakAllTime && (
            <ActionPanel.Section title="Player Stats">
              <Action
                // eslint-disable-next-line @raycast/prefer-title-case
                title={`All-Time Peak: ${details.peakAllTime}`}
                icon={Icon.BarChart}
                onAction={() => open(`https://steamcharts.com/app/${app.id}`)}
              />
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
