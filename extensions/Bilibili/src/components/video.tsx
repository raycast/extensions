import { formatUrl } from "../utils";

import { Action, ActionPanel, Color, Image, List } from "@raycast/api";

export function video(
  title: string,
  cover: string,
  url: string,
  uploader: Bilibili.uploader,
  duration: number | string,
  pubdate: number,
  stat: {
    highlight: string;
    view: number | string;
    danmaku: number | string;
    like?: number;
    coin?: number;
  }
) {
  return (
    <List.Item
      title={title}
      detail={
        <List.Item.Detail
          markdown={`![Cover](${formatUrl(cover)})`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title={title} />
              <List.Item.Detail.Metadata.Label
                title="Uploader"
                text={uploader.name}
                icon={{
                  source: formatUrl(uploader.face),
                  mask: Image.Mask.Circle,
                }}
              />
              <List.Item.Detail.Metadata.Label title="Duration" text={String(duration)} />
              <List.Item.Detail.Metadata.Label title="Time" text={new Date(pubdate * 1000).toLocaleString()} />
              <List.Item.Detail.Metadata.TagList title="Stat">
                {stat.highlight && <List.Item.Detail.Metadata.TagList.Item text={stat.highlight} color={"#FB7299"} />}
                <List.Item.Detail.Metadata.TagList.Item text={`Play: ${stat.view}`} color={Color.Green} />
                {stat.coin && (
                  <List.Item.Detail.Metadata.TagList.Item text={`Coin: ${stat.coin}`} color={Color.Orange} />
                )}
                <List.Item.Detail.Metadata.TagList.Item text={`Danmaku: ${stat.danmaku}`} color={Color.Blue} />
              </List.Item.Detail.Metadata.TagList>
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Video" url={formatUrl(url)} />
          <Action.OpenInBrowser
            title={`Open ${uploader.name} Dynamic`}
            url={`https://space.bilibili.com/${uploader.mid}/dynamic`}
          />
        </ActionPanel>
      }
    />
  );
}
