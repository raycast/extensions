import { formatUrl } from "../utils";

import { Action, ActionPanel, Color, Image, List } from "@raycast/api";
const { Metadata } = List.Item.Detail;

function renderTypeText(type: Bilibili.DynamicType) {
  switch (type) {
    case "DYNAMIC_TYPE_FORWARD":
      return "Forward";
    case "DYNAMIC_TYPE_WORD":
    case "DYNAMIC_TYPE_DRAW":
      return "Post";
    case "DYNAMIC_TYPE_MUSIC":
      return "Music";
    case "DYNAMIC_TYPE_LIVE_RCMD":
      return "Live";
    case "DYNAMIC_TYPE_AV":
      return "Video";
    default: {
      const _text: never = type;
      return `Unknown ${_text}`;
    }
  }
}

export function Post(props: {
  title?: string;
  desc: string;
  cover?: string;
  pubdate: number;
  url: string;
  uploader: Bilibili.Uploader;
  stat: {
    comment: number;
    forward: number;
    like: number;
  };
  type: Bilibili.DynamicType;
}) {
  return (
    <List.Item
      title={props.desc}
      detail={
        <List.Item.Detail
          markdown={props.cover ? `<img src="${formatUrl(props.cover)}" center width="300" />` : props.desc}
          metadata={
            <Metadata>
              {props.title && <Metadata.Label title={props.title} />}
              <Metadata.Label
                title="Uploader"
                text={props.uploader.name}
                icon={{
                  source: formatUrl(props.uploader.face),
                  mask: Image.Mask.Circle,
                }}
              />
              <Metadata.Label title="Time" text={new Date(props.pubdate * 1000).toLocaleString()} />
              <Metadata.TagList title="Stat">
                <Metadata.TagList.Item text={renderTypeText(props.type)} color={"#FB7299"} />
                <Metadata.TagList.Item text={`Comment: ${props.stat.comment}`} color={Color.Blue} />
                <Metadata.TagList.Item text={`Forward: ${props.stat.forward}`} color={Color.Green} />
                <Metadata.TagList.Item text={`Like: ${props.stat.like}`} color={Color.Red} />
              </Metadata.TagList>
            </Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title={`Open ${renderTypeText(props.type)}`} url={formatUrl(props.url)} />
          <Action.OpenInBrowser
            title={`Open ${props.uploader.name} Dynamic`}
            url={`https://space.bilibili.com/${props.uploader.mid}/dynamic`}
          />
        </ActionPanel>
      }
    />
  );
}
