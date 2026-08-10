import { usePromise } from "@raycast/utils";
import { Profile, Val } from "../types";
import { useRef } from "react";
import { getPreferenceValues } from "@raycast/api";
import { API_URL } from "../constants";
import fetch from "node-fetch";

const { apiToken } = getPreferenceValues();

export const useRunApi = (username: Profile["username"], name: Val["name"], args: string[] = []) => {
  const abortable = useRef<AbortController>();
  const { isLoading, data, revalidate } = usePromise(
    async (url: string) => {
      const response = await fetch(url, {
        method: "POST",
        signal: abortable.current?.signal,
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ args }),
      });
      try {
        return (await response.json()) as any;
      } catch (e) {
        return { error: e };
      }
    },
    [`${API_URL}/run/${username}.${name}`],
    { abortable }
  );
  return { isLoading, data, revalidate };
};
