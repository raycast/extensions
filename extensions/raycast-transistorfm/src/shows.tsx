import { useEffect, useState } from "react";

import { Action, ActionPanel, Detail, Icon, List, showToast, Toast } from "@raycast/api";

import { showMetadata } from "./components/showMetadata";
import mappings from "./components/showMetadata/mappings";
import IShows from "./interfaces/shows";
import HTTPRequest from "./utils/request";

export default function Command() {
  const { data, isLoading, error } = HTTPRequest({
    url: "/shows",
  }) as {
    data: IShows | undefined;
    isLoading: boolean;
    error: { title: string; message: string; markdown: string } | undefined;
  };

  const showData = data?.data;

  if (showData) {
    const [showingDetail, setShowingDetail] = useState<boolean>(true);
    const [defaultShow, setDefaultShow] = useState<string | undefined>("");

    useEffect(() => {
      setDefaultShow(showData.pop()?.attributes.slug);
    }, []);

    return (
      <List isLoading={!defaultShow || isLoading} isShowingDetail={!showingDetail}>
        {showData &&
          !isLoading &&
          showData.map((show) => {
            const props: Partial<List.Item.Props> = showingDetail
              ? {
                  accessories: [
                    { text: mappings.createdAt(show).value },
                    { tag: defaultShow === show.attributes.slug ? "Default" : "" },
                  ],
                  detail: <List.Item.Detail markdown={mappings.author(show).value} />,
                }
              : {
                  accessories: [{ tag: defaultShow === show.attributes.slug ? "Default" : "" }],
                  detail: <List.Item.Detail metadata={showMetadata(show)} />,
                };

            return (
              <List.Item
                key={show.attributes.slug}
                icon={mappings.imageUrl(show).value || Icon.Bolt}
                title={mappings.title(show).value!}
                subtitle={mappings.description(show).value}
                {...props}
                actions={
                  <ActionPanel>
                    <Action title="Toggle Detail" onAction={() => setShowingDetail(!showingDetail)} />
                    <Action title="Set Default for Menu Bar" onAction={() => setDefaultShow(show.attributes.slug)} />
                  </ActionPanel>
                }
              ></List.Item>
            );
          })}
      </List>
    );
  } else if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: error.title,
      message: error.message,
    });

    return <Detail markdown={error.markdown} />;
  }
}
