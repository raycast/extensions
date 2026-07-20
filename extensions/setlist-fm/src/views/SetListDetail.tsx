import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Setlist } from "../types/Setlist";
import { Set } from "../types/Set";
import { Song } from "../types/Song";
import getFlagPrefix from "../helper/getFlag";

function SetListDetail({ setlist }: { setlist: Setlist }) {
  const getClipboardContent = (): string => {
    let clipBoardContent = "";
    clipBoardContent += `${setlist.artist.name} - ${getFlagPrefix(setlist.venue.city.country.code)}${setlist.venue.city.name} / ${setlist.venue.name}\n\n`;

    for (const set of setlist.sets.set) {
      clipBoardContent += set.encore ? "Encore\n\n" : "Set\n\n";
      for (const song of set.song) {
        clipBoardContent += song.name;
        const additionalInfos = [];
        if (song.tape) additionalInfos.push("Tape");
        if (song.cover) additionalInfos.push(`Originally by ${song.cover.name}`);
        if (additionalInfos.length > 0) {
          clipBoardContent += ` (${additionalInfos.join(", ")})`;
        }
        clipBoardContent += "\n";
      }
      clipBoardContent += "\n";
    }
    return clipBoardContent.trim();
  };

  const getSongTitle = (song: Song): string => {
    return song.name ? song.name : "Unknown";
  };

  const getEncodedSearchParameters = (song: Song): string => {
    let artistName = setlist.artist.name;
    if (song.cover) {
      artistName = song.cover.name;
    }
    const songName = song.name ? song.name : "";
    const searchString = artistName + " " + songName;
    const encodedSearchParameters = encodeURIComponent(searchString.trim());
    return encodedSearchParameters;
  };

  const getYouTubeSearchURL = (song: Song): string => {
    return `https://www.youtube.com/results?search_query=${getEncodedSearchParameters(song)}`;
  };

  const getAppleMusicSearchURL = (song: Song): string => {
    return `https://music.apple.com/search?term=${getEncodedSearchParameters(song)}`;
  };

  const getSpotifySearchURL = (song: Song): string => {
    return `https://open.spotify.com/search/${getEncodedSearchParameters(song)}`;
  };

  const getSongAccessories = (song: Song): List.Item.Accessory[] | undefined => {
    const accessories: List.Item.Accessory[] = [];
    if (song.cover) {
      accessories.push({ text: `Originally by ${song.cover.name}` });
    }
    if (song.tape) {
      accessories.push({ text: "📼" });
    }
    return accessories.length > 0 ? accessories : undefined;
  };

  return (
    <List
      navigationTitle={`${setlist.artist.name} - ${getFlagPrefix(setlist.venue.city.country.code)}${setlist.venue.city.name} / ${setlist.venue.name}`}
    >
      {setlist.sets.set.map((set: Set, index: number) => (
        <List.Section title={set.encore ? "Encore" : "Set"} key={index}>
          {set.song.map((song: Song, songIndex: number) => (
            <List.Item
              key={`${index}_${songIndex}_${song.name || "unknown"}`}
              title={getSongTitle(song)}
              subtitle={song.name ? "" : "Song title not known"}
              accessories={getSongAccessories(song)}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="View on setlist.fm" url={setlist.url} icon={Icon.Rocket} />
                  <Action.CopyToClipboard
                    title="Copy Setlist to Clipboard"
                    content={getClipboardContent()}
                    icon={Icon.CopyClipboard}
                  />
                  <Action.OpenInBrowser
                    title="Search Song on Youtube"
                    url={getYouTubeSearchURL(song)}
                    icon={Icon.Video}
                  />
                  <Action.OpenInBrowser
                    title="Search Song on Apple Music"
                    url={getAppleMusicSearchURL(song)}
                    icon={Icon.Music}
                  />
                  <Action.OpenInBrowser
                    title="Search Song on Spotify"
                    url={getSpotifySearchURL(song)}
                    icon={Icon.Music}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

export default SetListDetail;
