import { useState, useEffect } from "react";
import { Action, ActionPanel, Color, Grid, Icon, LocalStorage } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { WEB_URL } from "./constants/constants";
import Details from "./components/Details";
import { Episode } from "./types";
import { removeFromFavourites } from "./utils/favourites";

export default function Command() {
  const [favouritesArray, setFavouritesArray] = useState<Episode[]>([]);

  const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const getFavourites = async () => {
    try {
      const favourites = await LocalStorage.getItem("favourites");
      if (typeof favourites === "string") {
        setFavouritesArray(JSON.parse(favourites) as Episode[]);
      } else {
        setFavouritesArray([]);
      }
    } catch (error) {
      console.error("Error getting favourites from LocalStorage:", error);
      setFavouritesArray([]);
    }
  };

  useEffect(() => {
    getFavourites();
  }, []);

  const handleRemoveFromFavourites = async (data: Episode) => {
    const updatedFavourites = await removeFromFavourites(data);
    console.log("Updated favourites to: ", updatedFavourites);
    if (updatedFavourites) {
      setFavouritesArray(updatedFavourites);
    }
  };

  return (
    <Grid columns={4} filtering={false}>
      {favouritesArray.map((favourite, i: number) => (
        <Grid.Item
          key={`${i} ${favourite.name}`}
          content={favourite.media?.picture_large}
          title={favourite.name}
          subtitle={favourite.genres?.map((genre) => capitalize(genre.value)).join(", ")}
          actions={
            <ActionPanel title={favourite.name}>
              {favourite.episode_alias && favourite.show_alias && (
                <Action.Push
                  title="Open"
                  icon={Icon.AppWindowSidebarRight}
                  target={<Details path={`/shows/${favourite.show_alias}/episodes/${favourite.episode_alias}`} />}
                />
              )}
              {favourite && (
                <Action
                  title="Remove From Favourites"
                  icon={{ source: Icon.HeartDisabled, tintColor: Color.Red }}
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
                  onAction={async () => handleRemoveFromFavourites(favourite)}
                />
              )}
              {favourite.episode_alias && favourite.show_alias && (
                <Action.OpenInBrowser
                  title="Open in Browser"
                  url={`${WEB_URL}/shows/${favourite.show_alias}/episodes/${favourite.episode_alias}`}
                  icon={getFavicon(WEB_URL) || Icon.Globe}
                  shortcut={{ modifiers: ["cmd"], key: "b" }}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
