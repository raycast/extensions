import { formatUrl } from "../utils";

import { Action, ActionPanel, Color, Image, List } from "@raycast/api";

export function Video(props: {
  title: string;
  cover: string;
  url: string;
  uploader: Bilibili.uploader;
  duration: string;
  pubdate: number;
  stat: {
    highlight?: string;
    view?: string;
    danmaku?: string;
    like?: string;
    coin?: string;
  };
}) {
  return (
    <List.Item
      title={props.title}
      detail={
        <List.Item.Detail
          markdown={`![Cover](${formatUrl(props.cover)})`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title={props.title} />
              <List.Item.Detail.Metadata.Label
                title="Uploader"
                text={props.uploader.name}
                icon={{
                  source: formatUrl(props.uploader.face),
                  mask: Image.Mask.Circle,
                }}
              />
              <List.Item.Detail.Metadata.Label title="Duration" text={String(props.duration)} />
              <List.Item.Detail.Metadata.Label title="Time" text={new Date(props.pubdate * 1000).toLocaleString()} />
              <List.Item.Detail.Metadata.TagList title="Stat">
                {props.stat.highlight && (
                  <List.Item.Detail.Metadata.TagList.Item text={props.stat.highlight} color={"#FB7299"} />
                )}
                {props.stat.view && (
                  <List.Item.Detail.Metadata.TagList.Item text={`Play: ${props.stat.view}`} color={Color.Green} />
                )}
                {props.stat.coin && (
                  <List.Item.Detail.Metadata.TagList.Item text={`Coin: ${props.stat.coin}`} color={Color.Orange} />
                )}
                {props.stat.view && (
                  <List.Item.Detail.Metadata.TagList.Item text={`View: ${props.stat.view}`} color={Color.Brown} />
                )}
                {props.stat.danmaku && (
                  <List.Item.Detail.Metadata.TagList.Item text={`Danmaku: ${props.stat.danmaku}`} color={Color.Blue} />
                )}
              </List.Item.Detail.Metadata.TagList>
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Video" url={formatUrl(props.url)} />
          <Action.OpenInBrowser
            title={`Open ${props.uploader.name} Dynamic`}
            url={`https://space.bilibili.com/${props.uploader.mid}/dynamic`}
          />
        </ActionPanel>
      }
    />
  );
}
