import { getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { getErrorMessage } from "./utils";
import { youtube, youtube_v3 } from "@googleapis/youtube";
import { GaxiosResponse } from "googleapis-common";

function createClient(): youtube_v3.Youtube {
    const pref = getPreferenceValues();
    const apiKey = (pref.apikey as string) || "";
    const client = youtube({ version: "v3", auth: apiKey });
    return client;
}

export const youtubeClient = createClient();

export enum SearchType {
    channel = "channel",
    video = "video"
}

export interface Fetcher {
    updateInline: () => Promise<void>;
    refresh: () => Promise<void>;
}

export function useRefresher<T>(fn: (updateInline: boolean) => Promise<T>, deps?: React.DependencyList | undefined): {
    data: T | undefined;
    error?: string;
    isLoading: boolean;
    fetcher: Fetcher;
} {
    const [data, setData] = useState<T>();
    const [error, setError] = useState<string>();
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [timestamp, setTimestamp] = useState<Date>(new Date());
    const depsAll = [timestamp];
    if (deps) {
        for (const d of deps) {
            depsAll.push(d);
        }
    }
    let cancel = false;

    const fetcher: Fetcher = {
        updateInline: async () => {
            await fetchData(true);
        },
        refresh: async () => {
            setTimestamp(new Date());
        },
    };

    async function fetchData(updateInline = false) {
        if (cancel) {
            return;
        }

        setIsLoading(true);
        setError(undefined);

        try {
            const data = await fn(updateInline);
            if (!cancel) {
                setData(data);
            }
        } catch (e) {
            if (!cancel) {
                setError(getErrorMessage(e));
            }
        } finally {
            if (!cancel) {
                setIsLoading(false);
            }
        }
    }
    useEffect(() => {
        fetchData();

        return () => {
            cancel = true;
        };
    }, depsAll);

    return { data, error, isLoading, fetcher };
}

export interface VideoStatistics {
    commentCount: string,
    dislikeCount: string,
    favoriteCount: string,
    likeCount: string
    viewCount: string
}

export interface ChannelStatistics {
    commentCount: string,
    subscriberCount: string,
    videoCount: string,
    viewCount: string
}

export interface Thumbnail {
    url?: string
}

export interface Thumbnails {
    default?: Thumbnail,
    high?: Thumbnail
}

export interface Channel {
    id: string,
    title: string,
    description?: string,
    publishedAt: string,
    thumbnails: Thumbnails,
    statistics?: ChannelStatistics
}

export interface Video {
    id: string,
    title: string,
    description?: string,
    publishedAt: string,
    thumbnails: Thumbnails,
    statistics?: VideoStatistics,
    channelId: string,
    channelTitle: string
}

async function search(query: string, type: SearchType, channedId?: string | undefined): Promise<GaxiosResponse<youtube_v3.Schema$SearchListResponse>> {
    const data = await youtubeClient.search.list({
        q: query,
        part: ["id", "snippet"],
        type: [type],
        maxResults: 50,
        channelId: channedId
    });
    return data;
}

export async function searchVideos(query: string, channedId?: string | undefined): Promise<Video[]> {
    const data = await search(query, SearchType.video, channedId)
    const items = data?.data.items;
    const videoIds: string[] = [];
    const result: Video[] = []
    if (items) {
        for (const r of items) {
            const vid = r.id?.videoId;
            if (vid) {
                videoIds.push(vid);
                const v: Video = {
                    id: vid,
                    title: r.snippet?.title || "?",
                    description: r.snippet?.description || undefined,
                    publishedAt: r.snippet?.publishedAt || "?",
                    channelId: r.snippet?.channelId || "",
                    channelTitle: r.snippet?.channelTitle || "?",
                    thumbnails: {
                        default: {
                            url: r.snippet?.thumbnails?.default?.url || undefined
                        },
                        high: {
                            url: r.snippet?.thumbnails?.high?.url || undefined
                        }
                    }
                };
                result.push(v);
            }
        }
    }
    if (videoIds) {
        // get stats
        const statsData = await youtubeClient.videos.list({ id: videoIds, part: ["statistics"], maxResults: videoIds.length });
        const statsItems = statsData.data.items;
        if (statsItems) {
            for (const s of statsItems) {
                const si = s.statistics;
                if (si) {
                    const stats: VideoStatistics = {
                        commentCount: si.commentCount || "0",
                        dislikeCount: si.dislikeCount || "0",
                        favoriteCount: si.favoriteCount || "0",
                        likeCount: si.likeCount || "0",
                        viewCount: si.viewCount || "0"
                    };
                    if (s.id) {
                        const el = result.find(x => x.id === s.id);
                        if (el) {
                            el.statistics = stats;
                        }
                    }
                }
            }
        }
    }
    return result;
}

export async function searchChannels(query: string): Promise<Channel[]> {
    const data = await search(query, SearchType.channel)
    const items = data?.data.items;
    const channelIds: string[] = [];
    const result: Channel[] = []
    if (items) {
        for (const r of items) {
            const cid = r.id?.channelId;
            if (cid) {
                channelIds.push(cid);
                const v: Channel = {
                    id: cid,
                    title: r.snippet?.channelTitle || "?",
                    description: r.snippet?.description || undefined,
                    publishedAt: r.snippet?.publishedAt || "?",
                    thumbnails: {
                        default: {
                            url: r.snippet?.thumbnails?.default?.url || undefined
                        },
                        high: {
                            url: r.snippet?.thumbnails?.high?.url || undefined
                        }
                    }
                };
                result.push(v);
            }
        }
    }
    if (channelIds) {
        // get stats
        const statsData = await youtubeClient.channels.list({ id: channelIds, part: ["statistics"], maxResults: channelIds.length });
        const statsItems = statsData.data.items;
        if (statsItems) {
            for (const s of statsItems) {
                const si = s.statistics;
                if (si) {
                    const stats: ChannelStatistics = {
                        commentCount: si.commentCount || "0",
                        subscriberCount: si.subscriberCount || "0",
                        videoCount: si.videoCount || "0",
                        viewCount: si.viewCount || "0"
                    };
                    if (s.id) {
                        const el = result.find(x => x.id === s.id);
                        if (el) {
                            el.statistics = stats;
                        }
                    }
                }
            }
        }
    }
    return result;
}

export async function getChannel(channelId: string): Promise<Channel | undefined> {
    let result: Channel | undefined;
    if (channelId) {
        const data = await youtubeClient.channels.list({ id: [channelId], part: ["statistics", "snippet"], maxResults: 1 });
        const items = data.data.items;
        if (items && items.length > 0) {
            const item = items[0];
            const sn = item.snippet;
            if (!sn) {
                throw Error(`Could not find channel ${channelId}`);
            }
            result = {
                id: channelId,
                title: sn.title || "?",
                description: sn.description || undefined,
                publishedAt: sn.publishedAt || "?",
                thumbnails: {
                    default: {
                        url: sn.thumbnails?.default?.url || undefined
                    },
                    high: {
                        url: sn.thumbnails?.high?.url || undefined
                    }
                }
            };
            const sd = item.statistics;
            if (!sd) {
                throw Error(`Could not get stats of channel ${channelId}`);
            }
            result.statistics = {
                commentCount: sd.commentCount || "0",
                subscriberCount: sd.subscriberCount || "0",
                videoCount: sd.videoCount || "0",
                viewCount: sd.viewCount || "0"
            };
        }
    }
    return result;
}
