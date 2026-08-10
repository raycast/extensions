import got from "got";
import { load } from "cheerio";

export const getSongsterrResults = async (searchQuery: string) => {
  const { body } = await got(`https://www.songsterr.com/?pattern=${searchQuery}`);
  const $ = load(body);
  const songs = $("#search-wrap a")
    .toArray()
    .map((item) => ({
      title: $("div div:nth-child(1)", item).text().trim(),
      artist: $("div div:nth-child(2)", item).text().trim(),
      difficulty:
        $("span", item)
          .attr("title")
          ?.replace(/. Tier [0-9]+/, "") || "",
      url: "https://songsterr.com" + $(item).attr("href"),
    }));

  return songs.filter((song) => !!song.title || !!song.artist);
};

export const getGuitaretabResults = async (searchQuery: string) => {
  const { body } = await got(`https://www.guitaretab.com/fetch/?type=tab&query=${searchQuery}`);
  const $ = load(body);
  return $(".gtd-layout__content .gt-list .gt-list__row")
    .toArray()
    .map((item) => ({
      title: $(".gt-list__cell-title", item).text().trim(),
      artist: $(".gt-list__cell-subtitle", item).text().trim(),
      url: "https://www.guitaretab.com" + $(".gt-list__cell-title a", item).attr("href"),
    }));
};
