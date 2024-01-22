import fetch from 'node-fetch';
import { useEffect, useRef, useState } from 'react';

import { Action, ActionPanel, Color, Detail, Icon, List } from '@raycast/api';
import { useCachedPromise } from '@raycast/utils';

import IShows from './interfaces/shows';
import { requestOptions } from './utils/requests';

export default function Command() {
  const [showingDetail, setShowingDetail] = useState(true);
  const [defaultShow, setDefaultShow] = useState<string | undefined>("");

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
  }, []);

  return (
    <List isLoading={!defaultShow || isLoading} isShowingDetail={!showingDetail}>
      {data &&
        !isLoading &&
        data.map((show) => {
          const props: Partial<List.Item.Props> = showingDetail
            ? {
                detail: <List.Item.Detail markdown={show.attributes.author} />,
              }
            : {
                accessories: [{ text: defaultShow === show.attributes.slug ? "Default" : "" }],
                detail: (
                  <List.Item.Detail
                    metadata={
                      <Detail.Metadata>
                        <Detail.Metadata.Label
                          title="Created At"
                          text={new Date(show.attributes.created_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        />
                        <Detail.Metadata.Label title="Author" text={show.attributes.author} />
                        <Detail.Metadata.Label title="Description" text={show.attributes.description} />
                        <Detail.Metadata.Label
                          title="Show Type"
                          text={show.attributes.show_type.charAt(0).toUpperCase() + show.attributes.show_type.slice(1)}
                        />
                        <Detail.Metadata.Label
                          title="Visibility?"
                          text={!show.attributes.private ? "Public" : "Private"}
                        />
                        <Detail.Metadata.TagList title="Categories">
                          <Detail.Metadata.TagList.Item
                            text={show.attributes.category || "No category"}
                            color={show.attributes.category ? Color.PrimaryText : Color.SecondaryText}
                          />
                          <Detail.Metadata.TagList.Item
                            text={show.attributes.secondary_category || "No secondary category"}
                            color={show.attributes.secondary_category ? Color.PrimaryText : Color.SecondaryText}
                          />
                        </Detail.Metadata.TagList>
                        <Detail.Metadata.Separator />
                        <Detail.Metadata.Label title="Links" />
                        <Detail.Metadata.Link title="Website" target={show.attributes.website} text="Website URL" />
                        <Detail.Metadata.Link title="RSS Feed" target={show.attributes.feed_url} text="Feed URL" />
                        <Detail.Metadata.Separator />
                        <Detail.Metadata.Label title="Available On" />
                        {show.attributes.apple_podcasts && (
                          <Detail.Metadata.Link
                            title="Apple Podcasts"
                            target={show.attributes.apple_podcasts}
                            text="Go to Link"
                          />
                        )}
                        {show.attributes.google_podcasts && (
                          <Detail.Metadata.Link
                            title="Apple Podcasts"
                            target={show.attributes.google_podcasts}
                            text="Go to Link"
                          />
                        )}
                        {show.attributes.amazon_music && (
                          <Detail.Metadata.Link
                            title="Apple Podcasts"
                            target={show.attributes.amazon_music}
                            text="Go to Link"
                          />
                        )}
                        {show.attributes.deezer && (
                          <Detail.Metadata.Link
                            title="Apple Podcasts"
                            target={show.attributes.deezer}
                            text="Go to Link"
                          />
                        )}
                        {show.attributes.spotify && (
                          <Detail.Metadata.Link
                            title="Apple Podcasts"
                            target={show.attributes.spotify}
                            text="Go to Link"
                          />
                        )}
                        {show.attributes.castro && (
                          <Detail.Metadata.Link
                            title="Apple Podcasts"
                            target={show.attributes.castro}
                            text="Go to Link"
                          />
                        )}
                        {show.attributes.pocket_casts && (
                          <Detail.Metadata.Link
                            title="Apple Podcasts"
                            target={show.attributes.pocket_casts}
                            text="Go to Link"
                          />
                        )}
                      </Detail.Metadata>
                    }
                  />
                ),
              };
          return (
            <List.Item
              key={show.attributes.title}
              icon={show.attributes.image_url || Icon.Microphone}
              title={show.attributes.title}
              subtitle={show.attributes.description}
              {...props}
              actions={
                <ActionPanel>
                  <Action title="Toggle Detail" onAction={() => setShowingDetail(!showingDetail)} />
                  <Action title="Set Default for Menu Bar" onAction={() => setDefaultShow(show.attributes.slug)} />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
