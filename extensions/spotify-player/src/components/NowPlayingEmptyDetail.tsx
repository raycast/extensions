import { Icon, List } from "@raycast/api";

export default function NowPlayingEmptyDetail({ text }: { text: string }): JSX.Element {
  return (
    <List.Item.Detail
      markdown={`<img src="${Icon.Hourglass}" alt="${text}" width="160" height="160" />`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Track" text={text} icon={Icon.Hourglass} />
          <List.Item.Detail.Metadata.Label title="Artist" text="Unknown" />
          <List.Item.Detail.Metadata.Label title="Album" text="Unknown" />
          <List.Item.Detail.Metadata.Label title="Duration" text="00:00 | 00:00" />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
