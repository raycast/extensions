import { parseStringPromise } from "xml2js";
import { Feed, FeedItemInterface, FeedResponse } from "./responseTypes";

const parseXml = (xml: string) => parseStringPromise(xml, { explicitArray: false }) as Promise<FeedResponse>;

export const buildFeed = async (xml: string): Promise<Feed<FeedItemInterface>> => {
  const {
    rss: { channel },
  } = await parseXml(xml);
  return {
    ...channel,
    items: channel.item,
  };
};
