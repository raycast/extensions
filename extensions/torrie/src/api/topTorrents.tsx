import { Color } from "@raycast/api";
import { load } from "cheerio";
import fetch from "node-fetch";
import { Torrent } from "../interface/torrent";

export async function getTorrents(param: string): Promise<Torrent[]> {
  const BASE_URL = "https://1337x.to";
  const url = `${BASE_URL}/${param}`;
  const html = await fetch(url).then((res) => res.text());
  const $ = load(html);
  const raw_torrents = $("tr");
  const torrents: Torrent[] = [];
  raw_torrents.each((i, elem) => {
    const pageLink = BASE_URL + $(elem).find("a").eq(1).attr("href");
    const title = $(elem).find("a").text();
    const seeds = $(elem).find("td").eq(1).text();
    const leeches = $(elem).find("td").eq(2).text();
    let size = $(elem).find("td").eq(4).text();
    // remove last chars until we get a letter (hacky filter)
    while (!isNaN(parseInt(size[size.length - 1])) && size.length > 0) {
      size = size.slice(0, size.length - 1);
    }
    const color = getHealth(seeds, leeches);

    if (title && seeds && leeches) {
      torrents.push({
        title,
        pageLink,
        seeds,
        leeches,
        size,
        magnet: null,
        color,
      });
    }
  });
  return torrents;
}

function getHealth(seeds: string, leeches: string) {
  const seed_num = parseInt(seeds) || 0;
  const leech_num = parseInt(leeches) || 0;

  if (seed_num < 2 || seed_num * 5 < leech_num) return Color.Red;
  if (seed_num >= leech_num * 2) return Color.Green;
  return Color.Orange;
}

export async function extractMagnetLink(url: string) {
  const html = fetch(url).then((res) => res.text());

  return html.then((html) => {
    const $ = load(html);
    // magnet is href from a tag with which starts with magnet:
    for (let i = 0; i < $("a").length; i++) {
      const href = $("a").eq(i).attr("href");
      if (href) {
        if (href.startsWith("magnet:")) {
          return $("a").eq(i).attr("href");
        }
      }
    }
    return null;
  });
}
