import fetch from "node-fetch";
import { SearchResult } from "../interface/search-result";
import { ShowWatchTime } from "../interface/show-watch-time";
import { load } from "cheerio";

export async function getSuggestions(searchTerm: string): Promise<SearchResult[]> {
  const url = "https://www.bingeclock.com/call_search.php";
  const params = new URLSearchParams({
    sendSearch: "1",
    searchTerm: searchTerm,
  });
  const options = {
    method: "POST",
    headers: {
      "x-requested-with": "XMLHttpRequest",
    },
    body: params,
  };

  const response = await fetch(url, options);
  const html = await response.text();
  const searchResults: SearchResult[] = [];
  const $ = load(html);
  $(".search_item").each((_, elem) => {
    const titleElem = $(elem).find("a");
    const anchorElem = $(elem).find("a");
    const imageElem = $(elem).find(".search_image");

    const title = titleElem.text().trim();
    const url = anchorElem.attr("href") || "";
    const image = imageElem.attr("src") || "";
    const type = url.includes("/s/") ? "show" : "film";
    searchResults.push({
      title,
      url,
      image,
      type,
    });
  });
  return searchResults;
}

export async function getWatchTime(url: string): Promise<ShowWatchTime> {
  const response = await fetch(url);
  const html = await response.text();
  const $ = load(html);

  const showWatchTime: ShowWatchTime = {
    days: null,
    hours: null,
    minutes: null,
  };

  $(".date_counter_cont").each((_, elem) => {
    const dateNum = parseInt($(elem).find(".date_num").text().trim(), 10);
    const dateType = $(elem).find(".date_type").text().trim();

    if (dateType === "days") {
      showWatchTime.days = dateNum;
    } else if (dateType === "hours") {
      showWatchTime.hours = dateNum;
    } else if (dateType === "minutes") {
      showWatchTime.minutes = dateNum;
    }
  });

  return showWatchTime;
}
