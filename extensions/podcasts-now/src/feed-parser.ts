import { Cache } from "@raycast/api";
import { pick } from "lodash";
import Parser from "rss-parser";

export interface Episode {
  title: string;
  pubDate: string;
  link?: string;
  guid: string;
  enclosure: {
    url: string;
    length?: string;
  };
  "itunes:duration": string;
  itunes?: {
    image: string;
  };
}

export interface Podcast {
  feed: string;
  title: string;
  description: string;
  itunes?: {
    image: string;
  };
}

const parser: Parser<Podcast> = new Parser({
  headers: {
    Accept:
      "application/rss+xml, application/rdf+xml;q=0.8, application/atom+xml;q=0.6, application/xml;q=0.4, text/xml;q=0.4",
  },
  customFields: {
    item: ["itunes:duration"],
  },
});

const cache = new Cache({ namespace: "podcasts" });
export const getFeed = async (url: string): Promise<Podcast> => {
  const cached = cache.get(url);
  if (cached) return JSON.parse(cached);

  const data = await parser.parseURL(url);
  data.feed = url;
  const podcast = pick(data, ["feed", "title", "description", "itunes"]);
  cache.set(url, JSON.stringify(podcast));
  return podcast;
};

export const getEpisodes = async (url: string): Promise<Episode[]> => {
  const data = await parser.parseURL(url);
  return data.items as Episode[];
};
