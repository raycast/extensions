import { LocalStorage } from "@raycast/api";
import { XMLParser } from "fast-xml-parser";
import fetch from "node-fetch";

interface Channel {
  id: string;
  title: string;
}

export async function getStoredChannels(): Promise<Channel[]> {
  const channels = await LocalStorage.getItem<string>("youtube-channels");
  return channels ? JSON.parse(channels) : [];
}

export async function addChannel(channel: Channel): Promise<void> {
  const channels = await getStoredChannels();
  channels.push(channel);
  await LocalStorage.setItem("youtube-channels", JSON.stringify(channels));
}

export async function removeChannel(channelId: string): Promise<void> {
  const channels = await getStoredChannels();
  const updatedChannels = channels.filter((channel) => channel.id !== channelId);
  await LocalStorage.setItem("youtube-channels", JSON.stringify(updatedChannels));
}

export async function getChannelTitle(channelId: string): Promise<string> {
  try {
    const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    if (!response.ok) {
      throw new Error("Invalid channel ID");
    }
    const data = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
    const result = parser.parse(data);

    if (!result.feed || !result.feed.title) {
      throw new Error("Invalid channel data");
    }

    return result.feed.title;
  } catch (error) {
    console.error("Error fetching channel:", error);
    throw new Error("Invalid channel ID");
  }
}
