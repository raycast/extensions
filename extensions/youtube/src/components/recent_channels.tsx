import { Cache, getPreferenceValues } from "@raycast/api";
import { Channel } from "../lib/youtubeapi";
import { Preferences } from "../lib/types";

const { griditemsize } = getPreferenceValues<Preferences>();

const cache = new Cache();

export const getRecentChannels = () => getCachedChannels("recent-channels");
export const getPinnedChannels = () => getCachedChannels("pinned-channels");

export const getCachedChannels = (key: string): string[] => {
  const channels = cache.get(key);
  return channels ? JSON.parse(channels) : [];
};

export const addRecentChannel = (channel: Channel) => {
  const pinned = getPinnedChannels();
  if (pinned.find((id: string) => id === channel.id)) return;
  removeRecentChannel(channel.id);
  const recent = getRecentChannels();
  recent.unshift(channel.id);
  recent.splice(griditemsize * 2);
  cache.set("recent-channels", JSON.stringify(recent));
};

export const addPinnedChannel = (channel: Channel) => {
  removeRecentChannel(channel.id);
  removePinnedChannel(channel.id);
  const pinned = getPinnedChannels();
  pinned.unshift(channel.id);
  cache.set("pinned-channels", JSON.stringify(pinned));
};

export const removeChannel = (key: string, id: string) => {
  const channels = getCachedChannels(key);
  cache.set(key, JSON.stringify(channels.filter((c) => c !== id)));
};

export const removeRecentChannel = (id: string) => removeChannel("recent-channels", id);
export const clearRecentChannels = () => cache.remove("recent-channels");
export const removePinnedChannel = (id: string) => removeChannel("pinned-channels", id);
export const clearPinnedChannels = () => cache.remove("pinned-channels");
