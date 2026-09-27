import { searchChannels } from "../lib/youtubeapi";

type Input = {
  /** The name or topic of the YouTube channel to find. */
  query: string;
};

/** Search YouTube for channels matching a query. */
export default async function tool({ query }: Input) {
  const channels = await searchChannels(query);
  return channels.slice(0, 10).map((channel) => ({
    title: channel.title,
    description: channel.description,
    subscribers: channel.statistics?.subscriberCount,
    url: `https://www.youtube.com/channel/${channel.id}`,
  }));
}
