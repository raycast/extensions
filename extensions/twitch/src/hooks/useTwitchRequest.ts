/* eslint-disable @typescript-eslint/no-explicit-any -- we should allow `any` as the network response, otherwise we're getting into @tanstack/query territory and it gets complicated fast */
import fetch from "node-fetch";
import { useRef } from "react";

import { LaunchType, Toast, environment, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { getHeaders } from "@/helpers/auth";
import { zeroDate } from "@/helpers/cache";

const defaultSelect = (data: any) => data.data;

export type TwitchResponse<T> = {
  data: T;
  isLoading: boolean;
  revalidate: () => void;
  updatedAt: number;
};

export function useTwitchRequest<T>({
  url,
  initialData,
  enabled = true,
  select = defaultSelect,
}: {
  url: string;
  initialData: T;
  enabled?: boolean;
  select?: (data: any) => T;
}): TwitchResponse<T> {
  const initial = { data: initialData, updatedAt: zeroDate };
  const abortable = useRef<AbortController>();

  const { data, isLoading, revalidate } = useCachedPromise(
    async (url: string) => {
      const signal = abortable.current?.signal;
      const headers = await getHeaders();

      return fetch(url, { headers, signal })
        .then((response) => response.json())
        .then((data: any) => {
          if (data && data.data) {
            return {
              data: select(data),
              updatedAt: String(Date.now()),
            };
          }
          if (data.message) {
            throw new Error(data.message);
          } else {
            throw new Error("Request failed");
          }
        })
        .catch((e) => {
          if (e.name === "AbortError") throw e;
          if (environment.launchType === LaunchType.Background) console.error("Error", e.message);
          else showToast({ title: "Error", message: e.message, style: Toast.Style.Failure });
          throw e;
        });
    },
    [url],
    { keepPreviousData: true, execute: enabled, abortable, initialData: initial },
  );

  return {
    data: data.data,
    isLoading,
    revalidate,
    updatedAt: Number(data.updatedAt),
  };
}
