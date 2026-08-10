import { Detail } from "@raycast/api";

import { IEpisodeData } from "../../interfaces/episodes";
import { colorRotation } from "../../utils/colors";
import mappings from "./mappings";

export function episodeMetadata(episode: IEpisodeData) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label
        title={mappings.number(episode).label}
        text={mappings.number(episode).value?.toLocaleString()}
      />
      <Detail.Metadata.Label title={mappings.createdAt(episode).label} text={mappings.createdAt(episode).value} />
      {mappings.author(episode).value && (
        <Detail.Metadata.Label title={mappings.author(episode).label} text={mappings.author(episode).value} />
      )}
      {mappings.description(episode).value && (
        <Detail.Metadata.Label title={mappings.description(episode).label} text={mappings.description(episode).value} />
      )}
      {mappings.duration(episode).value && (
        <Detail.Metadata.Label
          title={mappings.duration(episode).label}
          text={mappings.duration(episode).value?.toLocaleString()}
        />
      )}
      <Detail.Metadata.Label title={mappings.type(episode).label} text={mappings.type(episode).value} />
      {mappings.publishedAt(episode).value && (
        <Detail.Metadata.Label
          title={mappings.publishedAt(episode).label}
          text={mappings.publishedAt(episode).value || ""}
        />
      )}

      {mappings.keywords(episode).value?.length === 0 && (
        <Detail.Metadata.TagList title={mappings.keywords(episode).label}>
          {mappings
            .keywords(episode)
            .value?.map((word) => <Detail.Metadata.TagList.Item text={word} color={colorRotation()} />)}
        </Detail.Metadata.TagList>
      )}

      <Detail.Metadata.Separator />

      <Detail.Metadata.Label title="Links" />
      <Detail.Metadata.Link
        title={mappings.shareUrl(episode).label}
        target={mappings.shareUrl(episode).target || ""}
        text={mappings.shareUrl(episode).value!}
      />
      {mappings.transcriptUrl(episode).value && (
        <Detail.Metadata.Link
          title={mappings.transcriptUrl(episode).label}
          target={mappings.transcriptUrl(episode).target || ""}
          text={mappings.transcriptUrl(episode).value!}
        />
      )}
    </Detail.Metadata>
  );
}
