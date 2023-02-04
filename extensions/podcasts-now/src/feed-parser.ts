import { pick } from "lodash";
import Parser from "rss-parser";

export interface Episode {
  title: string;
  pubDate: string;
  link?: string;
  guid: string;
  image?: {
    url: string;
  };
  enclosure: {
    url: string;
    length?: string;
  };
  "itunes:duration": string;
}

export interface Podcast {
  feedUrl: string;
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

export const getFeed = async (url: string): Promise<Podcast> => {
  const data = await parser.parseURL(url);
  data.feedUrl = url;
  return pick(data, ["feedUrl", "title", "description", "itunes"]);
};

export const getEpisodes = async (url: string): Promise<Episode[]> => {
  const data = await parser.parseURL(url);
  return data.items as Episode[];
};
