import { useState } from "react";

import { Action, ActionPanel, Clipboard, Detail, Icon, List, showToast, Toast } from "@raycast/api";

import { episodeMetadata } from "./components/episodeMetadata";
import mappings from "./components/episodeMetadata/mappings";
import IEpisodes from "./interfaces/episodes";
import HTTPRequest from "./utils/request";

export default function Command() {
  const { data, isLoading, error } = HTTPRequest({
    url: "/episodes",
  }) as {
    data: IEpisodes | undefined;
    isLoading: boolean;
    error: { title: string; message: string; markdown: string } | undefined;
  };

  const episodeData = data?.data;

  if (episodeData) {
    const [showingDetail, setShowingDetail] = useState<boolean>(true);

    return (
      <List isLoading={isLoading} isShowingDetail={!showingDetail}>
        {episodeData &&
          !isLoading &&
          episodeData.map((episode) => {
            const props: Partial<List.Item.Props> = showingDetail
              ? {
                  accessories: [{ text: mappings.createdAt(episode).value }, { tag: mappings.type(episode).value }],
                  detail: <List.Item.Detail markdown={mappings.number(episode).value?.toLocaleString()} />,
                }
              : {
                  accessories: [{ text: episode.relationships.show.data.id }],
                  detail: <List.Item.Detail metadata={episodeMetadata(episode)} />,
                };
            return (
              <List.Item
                key={episode.attributes.title}
                icon={Icon.Hashtag}
                title={episode.attributes.title}
                subtitle={episode.attributes.description}
                {...props}
                actions={
                  <ActionPanel>
                    <Action title="Toggle Detail" onAction={() => setShowingDetail(!showingDetail)} />
                    <Action
                      title="Copy Share URL"
                      onAction={async () => await Clipboard.copy(episode.attributes.share_url)}
                    />
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
