import { Action, ActionPanel, List, Cache, showToast, confirmAlert } from "@raycast/api";
import prettyMilliseconds from "pretty-ms";
import axios from "axios";
import { useEffect, useState } from "react";
import { useCachedState } from "@raycast/utils";

import { CharacterData } from "./types";
import LatestRuns from "./LatestRuns";

const cache = new Cache();
const cachedFavorites = cache.get("favorites");

export default function Command() {
  const [charactersData, setCharactersData] = useCachedState<Record<string, CharacterData>>("characters-data", {});
  console.log("charactersData", charactersData);
  const [isLoading, setIsLoading] = useState(false);

  const [favorites, setFavorites] = useState<Array<{ name: string; realm: string }>>(
    cachedFavorites ? JSON.parse(cachedFavorites) : [],
  );

  function removeFromFavorites(realm: string, name: string) {
    confirmAlert({
      title: `Remove ${name} from favorites?`,
      message: "Are you sure you want to remove this character from favorites?",
      primaryAction: {
        title: "Remove",
        onAction: () => {
          const newFavorites = favorites.filter((favorite) => favorite.name !== name && favorite.realm !== realm);
          cache.set("favorites", JSON.stringify(newFavorites));
          setFavorites(newFavorites);
          showToast({ title: `Character ${name} on ${realm} removed from favorites` });
        },
      },
    });
  }

  useEffect(() => {
    setIsLoading(true);
    const promises = favorites.map(async (favorite) => {
      const url = new URL("https://raider.io/api/v1/characters/profile");
      url.searchParams.append("region", "us");
      url.searchParams.append("realm", favorite.realm);
      url.searchParams.append("name", favorite.name);
      url.searchParams.append("fields", "mythic_plus_scores_by_season:season-tww-1,mythic_plus_recent_runs");

      const res = await axios.get(url.toString());
      setCharactersData((prev) => {
        prev[`${favorite.name}-${favorite.realm}`] = res.data;
        return prev;
      });
    });

    Promise.all(promises).then(() => {
      setIsLoading(false);
    });
  }, []);

  return (
    <List isLoading={isLoading}>
      {favorites.map((favorite, index) => {
        const data = charactersData[`${favorite.name}-${favorite.realm}`];
        return (
          <List.Item
            key={`${favorite.name}-${index}`}
            title={data ? `${favorite.name} - ${data ? data.realm : favorite.realm}` : favorite.name}
            icon={
              data
                ? {
                    source: data?.thumbnail_url,
                  }
                : undefined
            }
            subtitle={
              data
                ? `Score: ${data.mythic_plus_scores_by_season[0].scores.all} - Latest Run: +${data.mythic_plus_recent_runs[0].mythic_level} ${data.mythic_plus_recent_runs[0].dungeon} ${prettyMilliseconds(data.mythic_plus_recent_runs[0].clear_time_ms, { colonNotation: true })}`
                : ""
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open RaiderIO Profile"
                  url={`https://raider.io/characters/us/${favorite.realm}/${favorite.name}`}
                />
                <Action.OpenInBrowser
                  title="Open Warcraft Logs Profile"
                  url={`https://www.warcraftlogs.com/character/us/${favorite.realm}/${favorite.name}`}
                  shortcut={{ modifiers: ["shift"], key: "w" }}
                />
                <Action
                  title="Remove from Favorites"
                  onAction={() => removeFromFavorites(favorite.realm, favorite.name)}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
                {data && (
                  <Action.Push
                    title="View Recent Runs"
                    target={<LatestRuns data={data} />}
                    shortcut={{ modifiers: ["shift"], key: "r" }}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
