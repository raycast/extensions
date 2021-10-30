import { getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { getErrorMessage } from "./utils";
import { youtube, youtube_v3 } from "@googleapis/youtube";

function createClient(): youtube_v3.Youtube {
    const pref = getPreferenceValues();
    const apiKey = (pref.apikey as string) || "";
    const client = youtube({ version: "v3", auth: apiKey });
    return client;
}

export const youtubeClient = createClient();

export enum SearchType {
    channel = "channel",
    video = "video",
    any = ""
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