import React from "react";
// src/index.tsx
import { List, Image } from "@raycast/api";
import { useEffect, useState } from "react";

// Popular game IDs
const POPULAR_GAMES = [
  { id: 730, name: "Counter-Strike 2" },
  { id: 570, name: "Dota 2" },
  { id: 1172470, name: "Apex Legends" },
  { id: 578080, name: "PUBG: BATTLEGROUNDS" },
  { id: 271590, name: "Grand Theft Auto V" },
  { id: 252490, name: "Rust" },
  { id: 1938090, name: "Call of Duty" },
  { id: 440, name: "Team Fortress 2" },
  { id: 1091500, name: "Cyberpunk 2077" },
  { id: 1174180, name: "Red Dead Redemption 2" },
  { id: 359550, name: "Tom Clancy's Rainbow Six Siege" },
  { id: 1245620, name: "Elden Ring" },
  { id: 1599340, name: "Lost Ark" },
  { id: 431960, name: "Wallpaper Engine" },
  { id: 1551360, name: "Baldur's Gate 3" },
  { id: 1326470, name: "Sons Of The Forest" },
  { id: 230410, name: "Warframe" },
  { id: 346110, name: "ARK: Survival Evolved" },
  { id: 1085660, name: "Destiny 2" },
  { id: 105600, name: "Terraria" },
  { id: 1811260, name: "EA SPORTS FC 24" },
  { id: 252950, name: "Rocket League" },
  { id: 292030, name: "The Witcher 3: Wild Hunt" },
  { id: 218620, name: "PAYDAY 2" },
  { id: 550, name: "Left 4 Dead 2" },
  { id: 1203220, name: "NARAKA: BLADEPOINT" },
  { id: 582010, name: "Monster Hunter: World" },
  { id: 1449850, name: "Fallout 76" },
  { id: 381210, name: "Dead by Daylight" },
  { id: 236390, name: "War Thunder" },
  { id: 1293830, name: "Forza Horizon 5" },
  { id: 1506830, name: "FIFA 23" },
  { id: 945360, name: "Among Us" },
  { id: 1063730, name: "New World" },
  { id: 1222670, name: "The Finals" },
  { id: 1517290, name: "Battlefield 2042" },
  { id: 1238840, name: "Battlefield 1" },
  { id: 1238810, name: "Battlefield V" },
  { id: 1238860, name: "Battlefield 4" },
  { id: 646570, name: "Slay the Spire" },
  { id: 1172620, name: "Sea of Thievßßes" },
  { id: 594650, name: "Hunt: Showdown" },
  { id: 304930, name: "Unturned" },
  { id: 322330, name: "Don't Starve Together" },
  { id: 1716740, name: "VALORANT" },
  { id: 1240440, name: "Halo Infinite" },
  { id: 1817070, name: "Overwatch 2" },
  { id: 391540, name: "Undertale" },
  { id: 620, name: "Portal 2" },
  { id: 400, name: "Portal" },
  { id: 413150, name: "Stardew Valley" },
  { id: 1145360, name: "Hades" },
  { id: 1426210, name: "It Takes Two" },
  { id: 377160, name: "Fallout 4" },
  { id: 489830, name: "The Elder Scrolls V: Skyrim Special Edition" },
  { id: 72850, name: "The Elder Scrolls V: Skyrim" },
  { id: 22380, name: "Fallout: New Vegas" },
  { id: 22370, name: "Fallout 3" },
  { id: 22300, name: "Fallout 2" },
  { id: 22320, name: "Fallout" },
  { id: 1794680, name: "Palworld" },
  { id: 1446780, name: "MONSTER HUNTER RISE" },
  { id: 1817190, name: "Helldivers 2" },
  { id: 1888930, name: "Star Wars Outlaws" },
];

interface PlayerCount {
  response: {
    player_count: number;
    result: number;
  };
}

export default function Command() {
  const [games, setGames] = useState<{ id: number; name: string; players?: number; icon?: string }[]>(POPULAR_GAMES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPlayerCounts() {
      const updatedGames = [...games];

      for (let i = 0; i < updatedGames.length; i++) {
        try {
          const response = await fetch(
            `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${updatedGames[i].id}`,
          );
          const data = (await response.json()) as PlayerCount;
          updatedGames[i].players = data.response.player_count;

          // Add game icon URL from Steam
          updatedGames[i].icon = `https://cdn.cloudflare.steamstatic.com/steam/apps/${updatedGames[i].id}/header.jpg`;
        } catch (error) {
          console.error(`Error fetching data for ${updatedGames[i].name}:`, error);
        }
      }

      // Sort by player count (highest first)
      updatedGames.sort((a, b) => (b.players || 0) - (a.players || 0));
      setGames(updatedGames);
      setIsLoading(false);
    }

    fetchPlayerCounts();
  }, []);

  return (
    <List isLoading={isLoading}>
      {games.map((game) => (
        <List.Item
          key={game.id}
          title={game.name}
          icon={game.icon ? { source: game.icon, mask: Image.Mask.RoundedRectangle } : undefined}
          accessories={[{ text: game.players ? `${game.players.toLocaleString()} players` : "Loading..." }]}
        />
      ))}
    </List>
  );
}
