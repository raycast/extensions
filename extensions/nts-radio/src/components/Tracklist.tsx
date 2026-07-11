import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { EpisodeTracklistResult } from "../types";
import { getFavicon } from "@raycast/utils";

type Props = {
  tracklist: EpisodeTracklistResult[];
};

const Tracklist = ({ tracklist }: Props) => {
  const getSanitizedTrackInformation = (track: EpisodeTracklistResult, target: string): string => {
    const whitespace = target === "spotify" ? "%20" : "+";
    const sanitizedTitle = track.title.replace(/\s+/g, whitespace);
    const sanitizedArtist = track.artist.replace(/\s+/g, whitespace);
    return `${sanitizedTitle}${whitespace}${sanitizedArtist}`;
  };

  return (
    <List>
      {tracklist.map((track, i) => (
        <List.Item
          key={`${i} ${track.artist} ${track.title}`}
          title={track.title}
          subtitle={track.artist}
          icon={Icon.Music}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Search for Track on Spotify"
                icon={getFavicon("https://www.spotify.com") || Icon.Globe}
                url={`https://open.spotify.com/search/${getSanitizedTrackInformation(track, "spotify")}`}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
              />
              <Action.OpenInBrowser
                title="Search for Track on Discogs"
                icon={getFavicon("https://www.discogs.com") || Icon.Globe}
                url={`https://www.discogs.com/en/search/?q=${getSanitizedTrackInformation(track, "discogs")}&type=all`}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
              <Action.OpenInBrowser
                title="Search for Track on Youtube"
                icon={getFavicon("https://www.youtube.com") || Icon.Globe}
                url={`https://www.youtube.com/results?search_query=${getSanitizedTrackInformation(track, "youtube")}`}
                shortcut={{ modifiers: ["cmd"], key: "y" }}
              />
              <Action.CopyToClipboard
                title="Copy Track & Artist Name to Clipboard"
                icon={Icon.CopyClipboard}
                content={`${track.title} - ${track.artist}`}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default Tracklist;
