import { Detail, Icon } from "@raycast/api";

export default function NowPlayingEmptyDetail({
  title,
  showLoadingImage,
}: {
  showLoadingImage?: boolean;
  title: string;
}): JSX.Element {
  return (
    <Detail
      markdown={
        showLoadingImage ? `<img src="${Icon.Hourglass}" alt="${title}" width="275" height="275" />` : `# ${title}`
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Track" text={title} icon={Icon.Hourglass} />
          <Detail.Metadata.Label title="Artist" text="Unknown" />
          <Detail.Metadata.Label title="Album" text="Unknown" />
          <Detail.Metadata.Label title="Duration" text="00:00 | 00:00" />
        </Detail.Metadata>
      }
    />
  );
}
