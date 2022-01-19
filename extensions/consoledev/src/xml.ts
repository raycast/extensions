import { promisify } from "util";
import { parseString } from "xml2js";
import { FeedItemInterface } from "./responseTypes";

const parseXml = promisify(parseString) as (xml: string) => Promise<any>;

type RSSObject<T> = {
  [key in keyof T]: [T[key]];
};

const parseRSSObject = <T>(rssObject: RSSObject<T>): T & { mediaContent?: string } =>
  Object.keys(rssObject).reduce(
    (acc, k) =>
      k === "media:content"
        ? {
            ...acc,
            mediaContent: (rssObject as any)[k][0].$.url,
          }
        : {
            ...acc,
            [k]: (rssObject as any)[k][0].replace("&amp;", "&"),
          },
    {} as T
  );

export const buildFeed = async (xml: string) => {
  const {
    rss: {
      channel: [data],
    },
  } = await parseXml(xml);

  return {
    title: data.title[0],
    link: data.link[0],
    description: data.description[0],
    image: {
      link: data.image[0].url[0],
      title: data.image[0].title[0],
      url: data.image[0].url[0],
    },
    language: data.language[0],
    webMaster: data.webMaster[0],
    managingEditor: data.managingEditor[0],
    items: data.item.map((item: RSSObject<FeedItemInterface>) => parseRSSObject<FeedItemInterface>(item)),
    feedUrl: data.link[0],
  };
};
