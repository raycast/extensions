import { Action, ActionPanel, Color, Image, List } from "@raycast/api";
import { formatUrl } from "../utils";

export function Post(props: {
  desc: string;
  pubdate: number;
  url: string;
  uploader: Bilibili.uploader;
  stat: {
    comment: number;
    forward: number;
    like: number;
  };
}) {
  return (
    <List.Item
      title={props.desc}
      detail={
        <List.Item.Detail
          markdown={props.desc}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Uploader"
                text={props.uploader.name}
                icon={{
                  source: formatUrl(props.uploader.face),
                  mask: Image.Mask.Circle,
                }}
              />
              <List.Item.Detail.Metadata.Label title="Time" text={new Date(props.pubdate * 1000).toLocaleString()} />
              <List.Item.Detail.Metadata.TagList title="Stat">
                <List.Item.Detail.Metadata.TagList.Item text={`Comment: ${props.stat.comment}`} color={Color.Blue} />
                <List.Item.Detail.Metadata.TagList.Item text={`Forward: ${props.stat.forward}`} color={Color.Green} />
                <List.Item.Detail.Metadata.TagList.Item text={`Like: ${props.stat.like}`} color={Color.Red} />
              </List.Item.Detail.Metadata.TagList>
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Post" url={formatUrl(props.url)} />
          <Action.OpenInBrowser
            title={`Open ${props.uploader.name} Dynamic`}
            url={`https://space.bilibili.com/${props.uploader.mid}/dynamic`}
          />
        </ActionPanel>
      }
    />
  );
}
