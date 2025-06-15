import { useEffect, useState } from "react";

import { Detail, Icon, LocalStorage, MenuBarExtra, open, showToast, Toast } from "@raycast/api";

import IAnalytics from "./interfaces/analytics";
import IShows from "./interfaces/shows";
import HTTPRequest from "./utils/request";

export default function Command() {
  const [defaultShow, setDefaultShow] = useState<string | undefined>("");
  const [defaultShowTitle, setDefaultShowTitle] = useState<string | undefined>("");

  const { data, isLoading } = HTTPRequest({
    url: "/shows",
  }) as {
    data: IShows | undefined;
    isLoading: boolean;
    error: { title: string; message: string; markdown: string } | undefined;
  };

  useEffect(() => {
    async function fetchDefaultShow() {
      const showSlug = await LocalStorage.getItem<string>("defaultShowSlug");
      const showTitle = await LocalStorage.getItem<string>("defaultShowTitle");

      if (showSlug) {
        setDefaultShow(showSlug);
      } else {
        setDefaultShow(data?.data.pop()?.attributes.slug);
      }

      if (showTitle) {
        setDefaultShowTitle(showTitle);
      } else {
        setDefaultShowTitle(data?.data.pop()?.attributes.title);
      }
    }

    fetchDefaultShow();
  }, []);

  const {
    data: analyticsData,
    isLoading: analyticsIsLoading,
    error: analyticsError,
  } = HTTPRequest({
    url: `/analytics/${defaultShow}`,
  }) as {
    data: IAnalytics | undefined;
    isLoading: boolean;
    error: { title: string; message: string; markdown: string } | undefined;
  };

  if (isLoading) {
    return <MenuBarExtra isLoading={isLoading} />;
  }

  const downloads = analyticsData?.data.attributes.downloads.pop()!.downloads.toLocaleString();

  if (analyticsData) {
    return (
      <MenuBarExtra icon={Icon.Download} isLoading={isLoading && analyticsIsLoading} title={downloads}>
        <MenuBarExtra.Item title={"Current Show: " + defaultShowTitle} />

        <MenuBarExtra.Separator />

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
  } else if (analyticsError) {
    showToast({
      style: Toast.Style.Failure,
      title: analyticsError.title,
      message: analyticsError.message,
    });

    return <Detail markdown={analyticsError.markdown} />;
  }
}
