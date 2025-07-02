import { MenuBarExtra, Icon, closeMainWindow, launchCommand, LaunchType } from "@raycast/api";
import { useEffect, useState } from "react";
import { playStation } from "./utils/player";
import { Station } from "./types/station";
import { getFavorites } from "./utils/storage";
import { fetchStations } from "./utils/api";

export default function Command() {
  const [favoriteStations, setFavoriteStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
    // Refresh favorites every 10 minutes
    const interval = setInterval(loadFavorites, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  async function loadFavorites() {
    try {
      const [favorites, allStations] = await Promise.all([getFavorites(), fetchStations()]);
      const favoriteStationsList = allStations.filter((station) => favorites.includes(station.id));
      setFavoriteStations(favoriteStationsList);
    } catch (error) {
      console.error("Failed to load favorites:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePlayStation(station: Station) {
    await closeMainWindow();
    await playStation(station);
  }

  const menuIcon = favoriteStations.length > 0 ? "🎵" : "📻";
  const tooltip = favoriteStations.length > 0 ? "SomaFM Favorites" : "SomaFM - No favorites yet";

  return (
    <MenuBarExtra icon={menuIcon} tooltip={tooltip} isLoading={isLoading}>
      {favoriteStations.length > 0 ? (
        <>
          <MenuBarExtra.Section title="Favorite Stations">
            {favoriteStations.map((station) => (
              <MenuBarExtra.Item
                key={station.id}
                title={station.title}
                subtitle={station.lastPlaying || station.genre}
                tooltip={station.lastPlaying ? `Now Playing: ${station.lastPlaying}` : station.description}
                icon={station.image ? { source: station.image } : Icon.Music}
                onAction={() => handlePlayStation(station)}
              />
            ))}
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title="Browse All Stations"
              icon={Icon.List}
              onAction={async () => {
                try {
                  await launchCommand({
                    name: "browse-stations",
                    type: LaunchType.UserInitiated,
                  });
                } catch (error) {
                  console.error("Failed to launch browse-stations command:", error);
                }
              }}
            />
          </MenuBarExtra.Section>
        </>
      ) : (
        <>
          <MenuBarExtra.Item
            title="No favorite stations yet"
            subtitle="Star stations in the browser to see them here"
            icon={Icon.Star}
          />
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title="Browse All Stations"
              icon={Icon.List}
              onAction={async () => {
                await launchCommand({
                  name: "index",
                  type: LaunchType.UserInitiated,
                });
              }}
            />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
