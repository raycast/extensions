import { getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import fetch from "node-fetch";
import { useEffect, useMemo } from "react";
import { toURLSearchParams } from "./toURLSearchParams";
import { useFetchWithEtag } from "./useFetchEtag";

const API_ROOT = "https://api.feedbin.com";

export interface Entry {
  id: number;
  feed_id: number;
  summary: string;
  title: string | null;
  author: string | null;
  content: string | null;
  url: string;
  extracted_content_url: string;
  published: string;
  created_at: string;
}

export interface Subscription {
  id: number;
  created_at: string;
  feed_id: number;
  title: string;
  feed_url: string;
  site_url: string;
  json_feed: {
    favicon: string;
    feed_url: string;
    icon: string;
    version: string;
    home_page_url: string;
    title: string;
  };
}

function getHeaders(rest: Record<string, string> = {}) {
  const { email, password } = getPreferenceValues<ExtensionPreferences>();
  return {
    Authorization: "Basic " + btoa(`${email}:${password}`),
    ...rest,
  };
}

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
};

type EntriesParams = {
  mode?: "extended";
  read?: false;
  starred?: true;
  page?: number;
  feedId?: number;
  per_page?: number;
};

export function useEntries({ feedId, ...params }: EntriesParams = {}) {
  const searchParams = toURLSearchParams(params);
  const { error, revalidate, ...rest } = useFetchWithEtag<Entry[]>(
    feedId
      ? `${API_ROOT}/v2/feeds/${feedId}/entries.json?${searchParams}`
      : `${API_ROOT}/v2/entries.json?${searchParams}`,
    {
      method: "GET",
      headers: getHeaders(),
    },
  );

  useEffect(() => {
    if (error) {
      showFailureToast("Failed to load entries", {
        primaryAction: {
          title: "Retry",
          shortcut: { modifiers: ["cmd"], key: "r" },
          onAction: () => {
            revalidate();
          },
        },
      });
    }
  }, [error]);

  return {
    revalidate,
    error,
    ...rest,
  };
}

export function useSubscriptions() {
  const { error, revalidate, ...rest } = useFetchWithEtag<Subscription[]>(
    `${API_ROOT}/v2/subscriptions.json?`,
    {
      method: "GET",
      headers: getHeaders(),
    },
  );

  useEffect(() => {
    if (error) {
      showFailureToast("Failed to load subscriptions", {
        primaryAction: {
          shortcut: { modifiers: ["cmd"], key: "r" },
          title: "Retry",
          onAction: () => {
            revalidate();
          },
        },
      });
    }
  }, [error]);

  return {
    error,
    revalidate,
    ...rest,
  };
}

export function useSubscriptionMap() {
  const { isLoading, data } = useSubscriptions();
  const subscriptionMap = useMemo(
    () =>
      data
        ? data.reduce<Record<number, Subscription>>(
            (acc, sub) => ({ ...acc, [sub.feed_id]: sub }),
            {},
          )
        : {},
    [data],
  );

  return {
    isLoading,
    data: subscriptionMap,
  };
}

export function markAsRead(...entryIds: number[]) {
  return fetch(`${API_ROOT}/v2/unread_entries.json`, {
    body: JSON.stringify({
      unread_entries: entryIds,
    }),
    method: "DELETE",
    headers: getHeaders(jsonHeaders),
  }).catch((err) => {
    showFailureToast("Failed to mark as read");
    throw err;
  });
}

export function starEntries(...entryIds: number[]) {
  return fetch(`${API_ROOT}/v2/starred_entries.json`, {
    body: JSON.stringify({
      starred_entries: entryIds,
    }),
    method: "POST",
    headers: getHeaders(jsonHeaders),
  }).catch((err) => {
    showFailureToast("Failed to Star");
    throw err;
  });
}

export function deleteStarredEntries(...entryIds: number[]) {
  return fetch(`${API_ROOT}/v2/starred_entries.json`, {
    body: JSON.stringify({
      starred_entries: entryIds,
    }),
    method: "DELETE",
    headers: getHeaders(jsonHeaders),
  }).catch((err) => {
    showFailureToast("Failed to Unstar");
    throw err;
  });
}

export function useStarredEntriesIds() {
  return useFetchWithEtag<number[]>(`${API_ROOT}/v2/starred_entries.json`, {
    method: "GET",
    headers: getHeaders(),
  });
}

export function useStarredEntries(params: EntriesParams = {}) {
  return useEntries({ ...params, starred: true });
}

export function useFeedEntries(id: number) {
  return useFetchWithEtag<Entry[]>(`${API_ROOT}/v2/feeds/${id}/entries.json`, {
    method: "GET",
    headers: getHeaders(),
  });
}

export function unsubscribe(subscriptionId: number) {
  return fetch(`${API_ROOT}/v2/subscriptions/${subscriptionId}.json `, {
    method: "DELETE",
    headers: getHeaders(),
  }).catch((err) => {
    showFailureToast("Failed to Unsuscribe");
    throw err;
  });
}

export function useUnreadEntriesIds() {
  return useFetchWithEtag<number[]>(`${API_ROOT}/v2/unread_entries.json`, {
    method: "GET",
    headers: getHeaders(),
  });
}

export type SingleFeed = {
  feed_url: string;
};

export type MultipleFeeds = {
  feed_url: string;
  title: string;
}[];

export type Subscribe404 = { status: 404; message: null; errors: [] };

export type CreatedSubscription = SingleFeed | MultipleFeeds | Subscribe404;

export function createSubscription(url: string) {
  return fetch(`${API_ROOT}/v2/subscriptions.json`, {
    body: JSON.stringify({
      feed_url: url,
    }),
    method: "POST",
    headers: getHeaders(jsonHeaders),
  })
    .then((res) => {
      if (res.status === 401) {
        showFailureToast("Authorization Failed");
        return undefined;
      }
      return res.json();
    })
    .catch((err) => {
      showFailureToast("Failed to Subscribe");
      throw err;
    }) as Promise<CreatedSubscription>;
}

export function readLater(url: string) {
  return fetch(`${API_ROOT}/v2/pages.json`, {
    method: "POST",
    headers: getHeaders(jsonHeaders),
    body: JSON.stringify({ url }),
  })
    .then((res) => {
      if (res.status === 401) {
        showFailureToast("Authorization Failed");
        return undefined;
      }
      return res.json();
    })
    .catch((err) => {
      showFailureToast("Failed to Save to Read Later");
      throw err;
    }) as Promise<Entry>;
}

export function updateSubscription(id: number, title: string) {
  return fetch(`${API_ROOT}/v2/subscriptions/${id}.json`, {
    method: "PATCH",
    headers: getHeaders(jsonHeaders),
    body: JSON.stringify({ title }),
  }).then((res) => res.json());
}
