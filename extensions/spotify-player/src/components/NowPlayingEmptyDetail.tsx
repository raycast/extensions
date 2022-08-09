import { Detail, Icon } from "@raycast/api";

export default function NowPlayingEmptyDetail({ text }: { text: string }): JSX.Element {
  return (
    <Detail
      markdown={`<img src="${Icon.Hourglass}" alt="${text}" width="275" height="275" />`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Track" text={text} icon={Icon.Hourglass} />
          <Detail.Metadata.Label title="Artist" text="Unknown" />
          <Detail.Metadata.Label title="Album" text="Unknown" />
          <Detail.Metadata.Label title="Duration" text="00:00 | 00:00" />
        </Detail.Metadata>
      }
    />
  );
}
