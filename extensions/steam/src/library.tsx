import { useState, useEffect } from "react";
import { ActionPanel, Action, List, Icon, showToast, Toast, open } from "@raycast/api";
import { getInstalledSteamGames, SteamGame, formatFileSize, formatLastUpdated } from "./utils/steam-library";

export default function SteamLibrary() {
  const [games, setGames] = useState<SteamGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [totalSize, setTotalSize] = useState(0);
  const [gameCount, setGameCount] = useState(0);

  useEffect(() => {
    loadLibrary();
  }, []);

  async function loadLibrary() {
    setIsLoading(true);
    try {
      const libraryInfo = await getInstalledSteamGames();
      setGames(libraryInfo.games);
      setTotalSize(libraryInfo.totalSize);
      setGameCount(libraryInfo.gameCount);
      setIsLoading(false);

      if (libraryInfo.gameCount > 0) {
        showToast({
          style: Toast.Style.Success,
          title: "Library Loaded",
          message: `Found ${libraryInfo.gameCount} installed games`,
        });
      } else {
        showToast({
          style: Toast.Style.Animated,
          title: "No Games Found",
          message: "No Steam games detected. Make sure Steam is installed and games are installed.",
        });
      }
    } catch (error) {
      console.error("Library load error:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Library Load Failed",
        message: "Could not load Steam library. Check console for details.",
      });
      setIsLoading(false);
    }
  }

  async function launchGame(appId: number, gameName: string) {
    try {
      await open(`steam://run/${appId}`);
      showToast({
        style: Toast.Style.Success,
        title: "Game Launched",
        message: `Starting ${gameName}`,
      });
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "Launch Failed",
        message: "Could not launch the game. Make sure Steam is installed and running.",
      });
    }
  }

  async function openStorePage(appId: number, gameName: string) {
    try {
      await open(`https://store.steampowered.com/app/${appId}/`);
      showToast({
        style: Toast.Style.Success,
        title: "Store Page Opened",
        message: `Opening ${gameName} store page`,
      });
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Open Store",
        message: "Could not open the Steam store page",
      });
    }
  }

  const filteredGames = games.filter((game) => game.name.toLowerCase().includes(searchText.toLowerCase()));

  const sortedGames = filteredGames.sort((a, b) => {
    // Sort by last updated, then by name
    if (a.lastUpdated && b.lastUpdated) {
      return b.lastUpdated - a.lastUpdated;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <List
      searchBarPlaceholder="Search your library..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle
    >
      {sortedGames.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Book}
          title="No games found"
          description={gameCount === 0 ? "No Steam games installed" : "Try searching for a different game name"}
        />
      ) : (
        <>
          {gameCount > 0 && (
            <List.Section title={`Installed Games (${gameCount})`}>
              <List.Item title="Total Library Size" subtitle={formatFileSize(totalSize)} icon={Icon.HardDrive} />
            </List.Section>
          )}
          {sortedGames.map((game) => (
            <List.Item
              key={game.appid}
              title={game.name}
              subtitle={`${formatFileSize(game.sizeOnDisk)} • ${game.lastUpdated ? `Updated: ${formatLastUpdated(game.lastUpdated)}` : "Installation info"}`}
              icon={{
                source: `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/capsule_184x69.jpg`,
                fallback: Icon.Circle,
              }}
              accessories={[
                {
                  text: `App ID: ${game.appid}`,
                  tooltip: "Steam App ID",
                  icon: Icon.Number00,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action icon={Icon.Play} title="Launch Game" onAction={() => launchGame(game.appid, game.name)} />
                  <Action
                    icon={Icon.Globe}
                    title="Open Store Page"
                    onAction={() => openStorePage(game.appid, game.name)}
                  />
                  <ActionPanel.Section>
                    <Action
                      icon={Icon.MagnifyingGlass}
                      title="Search Games"
                      onAction={() =>
                        showToast({
                          style: Toast.Style.Success,
                          title: "Feature Coming Soon",
                          message: "Search games functionality will be available soon",
                        })
                      }
                    />
                    <Action
                      icon={Icon.Download}
                      title="Download Game"
                      onAction={() =>
                        showToast({
                          style: Toast.Style.Success,
                          title: "Feature Coming Soon",
                          message: "Download functionality will be available soon",
                        })
                      }
                    />
                    <Action
                      icon={Icon.Store}
                      title="Steam Store"
                      onAction={() =>
                        showToast({
                          style: Toast.Style.Success,
                          title: "Feature Coming Soon",
                          message: "Steam store functionality will be available soon",
                        })
                      }
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </>
      )}
    </List>
  );
}
