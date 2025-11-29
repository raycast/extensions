import { load } from "cheerio";

export type GameItem = {
  id: string;
  title: string;
  url: string;
  magnet: string;
  seeds: string;
  leeches: string;
  date: string;
  size: string;
};

export const parseSearchPage = (text: string): GameItem[] => {
  const $ = load(text);
  const items: GameItem[] = [];

  // CloudTorrents uses standard table rows for items
  $("table tbody tr").each((_, el) => {
    const $el = $(el);

    const $titleLink = $el.find(".torrent-title a").first();
    const detailUrl = $titleLink.attr("href") || "";

    // With torrent_type=4, we might not need to filter by URL path,
    // but it's safer to keep it or adjust if the structure changed.

    const title = $titleLink.text().trim();
    const id = detailUrl.split("/").filter(Boolean).pop() || String(Math.random());

    const magnet = $el.find("a.magnet-link").attr("href") || "";

    const size = $el.find("td[data-title='Size']").text().trim();
    const date = $el.find("td[data-title='Uploaded']").text().trim(); // e.g. "16 Sep, 2022"
    const seeds = $el.find("td[data-title='Se']").text().trim();
    const leeches = $el.find("td[data-title='Le']").text().trim();

    if (title && magnet) {
      items.push({
        id,
        title,
        url: detailUrl,
        magnet,
        seeds,
        leeches,
        date,
        size,
      });
    }
  });

  return items;
};
