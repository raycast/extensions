import { ActionPanel, Action, Detail, Icon, LocalStorage, Color } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { API_URL, WEB_URL } from "../constants/constants";
import { Episode, EpisodeGenre } from "../types";
import Tracklist from "./Tracklist";
import { useEffect, useState } from "react";
import { getDate } from "../utils/getDate";

type Props = {
  path: string;
};

const Details = ({ path }: Props) => {
  const { isLoading, data } = useFetch<Episode>(`${API_URL}${path}`);
  const [isEpisodeFavourite, setIsEpisodeFavourite] = useState(false);

  useEffect(() => {
    const checkFavourites = async () => {
      const episodeAlias = path?.split("/")?.pop();
      const hasPath = (array: Episode[]) => array.some((episode) => episode.episode_alias === episodeAlias);
      const favourites = await LocalStorage.getItem("favourites");
      const favouritesArray = typeof favourites === "string" ? (JSON.parse(favourites) as Episode[]) : [];

      setIsEpisodeFavourite(hasPath(favouritesArray) ? true : false);
    };
    checkFavourites();
  }, [path, data]);

  const markdown = `  
  [![${data?.name}](${data?.media?.picture_large})](${data?.media?.picture_large})
  
  # ${data?.name}

  ${data?.description}

`;

  const onAddToFavourites = async (data: Episode) => {
    if (!data) {
      console.error("Error adding to favourites: data is undefined");
      return;
    }

    try {
      const favourites = await LocalStorage.getItem("favourites");
      const favouritesArray = typeof favourites === "string" ? (JSON.parse(favourites) as Episode[]) : [];

      await LocalStorage.setItem("favourites", JSON.stringify([...favouritesArray, data]));

      setIsEpisodeFavourite(true);
      console.log("Added to favourites", await LocalStorage.getItem("favourites"));
    } catch (error) {
      console.error("Error adding to favourites:", error);
    }
  };

  const onRemoveFromFavourites = async (data: Episode) => {
    if (!data) {
      console.error("Error adding to favourites: data is undefined");
      return;
    }

    try {
      const favourites = await LocalStorage.getItem("favourites");
      const favouritesArray = typeof favourites === "string" ? (JSON.parse(favourites) as Episode[]) : [];

      await LocalStorage.setItem(
        "favourites",
        JSON.stringify(favouritesArray.filter((favourite) => favourite.episode_alias !== data.episode_alias))
      );
      setIsEpisodeFavourite(false);
      console.log("Removed from favourites", await LocalStorage.getItem("favourites"));
    } catch (error) {
      console.error("Error removing from favourites:", error);
    }
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={data?.name} icon={getFavicon(WEB_URL) || Icon.Globe} />
          <Detail.Metadata.Label title="Location" text={data?.location_long} icon={Icon.Pin} />
          <Detail.Metadata.Label title="Broadcast" text={getDate(data?.broadcast)} icon={Icon.Play} />
          <Detail.Metadata.TagList title={`Genres (${data?.genres?.length})`}>
            {data?.genres
              ?.sort((a, b) => (a.value > b.value ? 1 : -1))
              .map((tag: EpisodeGenre) => (
                <Detail.Metadata.TagList.Item key={tag.id} text={tag.value} color="#eed535" />
              ))}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={`${WEB_URL}/${path}`} icon={getFavicon(WEB_URL)} />
          {data?.embeds?.tracklist?.results && data?.embeds?.tracklist?.results.length > 0 && (
            <Action.Push
              title="Open Tracklist"
              icon={Icon.List}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              target={<Tracklist tracklist={data.embeds.tracklist.results} />}
            />
          )}
          {data?.mixcloud && (
            <Action.OpenInBrowser
              title="Open in Mixcloud"
              url={data.mixcloud}
              icon={getFavicon("https://www.mixcloud.com/") || Icon.Globe}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
            />
          )}
          {data?.audio_sources[0]?.source === "soundcloud" && (
            <Action.OpenInBrowser
              title="Open in Soundcloud"
              url={data.audio_sources[0].url}
              icon={getFavicon("https://www.soundcloud.com/") || Icon.Globe}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          )}
          {!isEpisodeFavourite && data && (
            <Action
              title="Add to Favourites"
              icon={{ source: Icon.Heart, tintColor: Color.Red }}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              onAction={async () => onAddToFavourites(data)}
            />
          )}
          {isEpisodeFavourite && data && (
            <Action
              title="Remove From Favourites"
              icon={{ source: Icon.HeartDisabled, tintColor: Color.Red }}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              onAction={async () => onRemoveFromFavourites(data)}
            />
          )}
        </ActionPanel>
      }
    ></Detail>
  );
};

export default Details;
