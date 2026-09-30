import { ActionPanel, Color, Icon, List, Action } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import axios from "axios";
import cheerio from "cheerio";
import { formatDistanceToNow } from "date-fns";

export default function Command() {
  const { data, isLoading } = usePromise(fetchReviews, []);
  const base_url = "https://pitchfork.com";

  return (
    <List isLoading={data === undefined} searchBarPlaceholder="Filter Reviews...">
      {data?.map((item, index) => (
        <List.Item
          key={index}
          title={`${item.artist} --- ${item.title}`}
          icon={{ source: bnm_to_icon(item.bnm), tintColor: genre_to_colour(item.genre, item.bnm) }}
          subtitle={{ tooltip: "", value: item.genre }}
          accessories={[{ text: timeAgo(item.date) }]}
          actions={
            <ActionPanel title={item.title}>
              <ActionPanel.Section>
                {item.url && <Action.OpenInBrowser url={base_url + item.url} title="Open Review" />}
                {item.url && <Action.CopyToClipboard content={base_url + item.url} title="Copy Link" />}
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function fetchReviews() {
  const url = "https://pitchfork.com/reviews/albums/";
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);

  const titles = $(".review__title .review__title-album")
    .map((_, element) => $(element).text())
    .get();

  const artists = $(".review__title .review__title-artist")
    // .map((_, element) => $(element).text())
    .map((_, element) => {
      const artistsInElement = $(element)
        .find("li")
        .map((_, artistElement) => $(artistElement).text())
        .get();
      return artistsInElement.join(", ");
    })
    .get();

  const dates = $(".review__meta .pub-date")
    .map((_, element) => new Date($(element).attr("datetime") || ""))
    .get();

  const genres = $(".review__meta .genre-list")
    .map((_, element) => {
      const genresInElement = $(element)
        .find(".genre-list__link")
        .map((_, genreElement) => $(genreElement).text())
        .get();
      return genresInElement.join(", ");
    })
    .get();

  const urls = $(".review__link")
    .map((_, element) => $(element).attr("href"))
    .get();

  const best_new_music: boolean[] = $(".review__meta")
    .map((_, element) => {
      const bnmElement = $(element).find(".review__meta-bnm");
      return bnmElement.length > 0 ? true : false;
    })
    .get();

  const albums = titles.map((title, index) => ({
    title,
    artist: artists[index],
    date: dates[index],
    genre: genres[index],
    url: urls[index],
    bnm: best_new_music[index],
  }));

  return albums;
}

function timeAgo(dateTime: Date | number): string {
  return formatDistanceToNow(dateTime, { addSuffix: true });
}

enum GenreColor {
  Electronic = Color.Blue,
  Experimental = Color.Blue,
  FolkCountry = Color.Yellow,
  Global = Color.Green,
  Jazz = Color.Green,
  Metal = Color.Magenta,
  PopRnB = Color.Red,
  Rap = Color.Orange,
  Rock = Color.Magenta,
  Unknown = Color.Purple,
}

function genre_to_colour(genre: string, bnm: boolean): string {
  const genreMapping: Record<string, keyof typeof GenreColor> = {
    Rock: "Rock",
    Jazz: "Jazz",
    Electronic: "Electronic",
    Experimental: "Experimental",
    Rap: "Rap",
    "Folk/Country": "FolkCountry",
    "Pop/R&B": "PopRnB",
    Metal: "Metal",
    Global: "Global",
  };

  const genreKey = genreMapping[genre] || "Unknown";
  const genre_color = GenreColor[genreKey];
  const selected_color = bnm ? GenreColor.PopRnB : genre_color;
  return selected_color.toString();
}

function bnm_to_icon(bnm: boolean): Icon {
  return bnm ? Icon.Star : Icon.Music;
}
