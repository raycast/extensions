import fetch from "node-fetch";
import { TvModel, TvModelFlag } from "../interface/tvmodel";
import parser from "iptv-playlist-parser";
import { CountryData } from "../interface/flag";
import { showToast, Toast } from "@raycast/api";

export async function getChannels(category: string): Promise<TvModelFlag[]> {
  const channels: TvModelFlag[] = [];
  const URL = "https://iptv-org.github.io/iptv/categories/" + category + ".m3u";
  try {
    const response = await fetch(URL);
    const data = await response.text();
    const playlists = parser.parse(data);
    playlists.items.forEach((playlist) => {
      // country tag is unreliable compared to url
      const splitted_url = playlist.tvg.id.split(".");
      const country_name = splitted_url[splitted_url.length - 1];
      const flag = CountryData[country_name as keyof typeof CountryData];

      // extract everything inside () from playlist.name
      const regex = /\((.*?)\)/g;
      const match = regex.exec(playlist.name);
      const res = match ? match[1] : "360p";

      // if res starts with a number then it's probably a resolution
      // if it's not then it's probably a string use "360p" as default
      const resolution = /^\d/.test(res) ? res : "360p";

      // add padding to resolution so it always takes up the same amount of space
      const padding = "     ";
      const padded_resolution = padding.substring(0, padding.length - resolution.length) + resolution;

      // remove everything inside () or [] from playlist.name and replace . with space
      const regex2 = /\[(.*?)\]/g;
      const title = playlist.name.replace(regex, "").replace(regex2, "").replace(".", " ");

      const tvmodel = playlist as TvModel;
      channels.push({
        tvModel: tvmodel,
        title: title,
        flag: flag,
        resolution: padded_resolution,
      });
    });
  } catch (error) {
    showToast({ title: "Error loading channels", style: Toast.Style.Failure });
    throw error;
  }
  return channels;
}
