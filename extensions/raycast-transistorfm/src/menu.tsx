import fetch from "node-fetch";
import { useEffect, useRef, useState } from "react";

import { Icon, MenuBarExtra, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import IAnalytics from "./interfaces/analytics";
import IShows from "./interfaces/shows";
import { requestOptions } from "./utils/requests";

export default function Command() {
  const [defaultShow, setDefaultShow] = useState<string | undefined>("Bingo");

  const abortable = useRef<AbortController>();

  const { isLoading, data } = useCachedPromise(
    async (url: string) => {
      const response = await fetch(url, requestOptions);
      const { data } = (await response.json()) as IShows;
      return data;
    },
    ["https://api.transistor.fm/v1/shows"],
    {
      abortable,
    },
  );

  useEffect(() => {
    data && setDefaultShow(data.pop()?.attributes.slug);
  }, [data, isLoading]);

  const { isLoading: isLoadingAnalytics, data: analytics } = useCachedPromise(
    async (url: string) => {
      const response = await fetch(url, requestOptions);
      const result = await response.json();
      const { data } = result as IAnalytics;
      return data;
    },
    [`https://api.transistor.fm/v1/analytics/${defaultShow}`],
    {
      // to make sure the screen isn't flickering when the searchText changes
      keepPreviousData: true,
    },
  );

  const downloads = data && analytics && analytics.attributes.downloads.pop()!.downloads.toString();

  return (
    <MenuBarExtra icon={Icon.Microphone} isLoading={isLoading && isLoadingAnalytics} title={downloads}>
      <MenuBarExtra.Item
        title="Open TransistorFM Dashboard"
        onAction={() => open(`https://dashboard.transistor.fm/shows/${defaultShow}`)}
      />

      <MenuBarExtra.Separator />

      <MenuBarExtra.Item
        title="Episodes"
        onAction={() => open(`https://dashboard.transistor.fm/shows/${defaultShow}/episodes`)}
      />

      <MenuBarExtra.Item
        title="Distribution"
        onAction={() => open(`https://dashboard.transistor.fm/shows/${defaultShow}/distribution`)}
      />

      <MenuBarExtra.Item
        title="Analytics"
        onAction={() => open(`https://dashboard.transistor.fm/shows/${defaultShow}/analytics`)}
      />
    </MenuBarExtra>
  );
}
