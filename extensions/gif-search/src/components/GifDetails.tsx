import { Detail } from "@raycast/api";
import FileSizeFormat from "@saekitominaga/file-size-format";

import { GifDetailsActions } from "./GifDetailsActions";
import { IGif, renderGifMarkdownDetails } from "../models/gif";
import { getServiceTitle, ServiceName } from "../preferences";

export function GifDetails(props: { item: IGif; service?: ServiceName }) {
  const { title, metadata, attribution } = props.item;

  const tags = [];
  if (metadata?.tags?.length) {
    tags.push(
      <Detail.Metadata.TagList title="tags">
        {metadata.tags.map((tag, index) => (
          <Detail.Metadata.TagList.Item text={tag} key={index} />
        ))}
      </Detail.Metadata.TagList>
    );
  }
  const labels = metadata?.labels
    ?.filter(Boolean)
    .map(({ title, text }, index) => <Detail.Metadata.Label title={title} text={text} key={index} />);
  const links = metadata?.links
    ?.filter(Boolean)
    .map(({ title, text, target }, index) => (
      <Detail.Metadata.Link title={title} text={text} target={target} key={index} />
    ));

  return (
    <Detail
      markdown={renderGifMarkdownDetails(props.item)}
      actions={<GifDetailsActions item={props.item} showViewDetails={false} service={props.service} />}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Title" text={title} />
          {metadata?.width ? (
            <Detail.Metadata.Label title="Width" text={`${metadata.width.toString()}px`} />
          ) : undefined}
          {metadata?.height ? (
            <Detail.Metadata.Label title="Height" text={`${metadata.height.toString()}px`} />
          ) : undefined}
          {metadata?.size && <Detail.Metadata.Label title="Size" text={FileSizeFormat.si(metadata?.size)} />}
          {labels}
          {links}
          {tags}
          <Detail.Metadata.Label title="Source" text={getServiceTitle(props.service)} icon={attribution} />
        </Detail.Metadata>
      }
    />
  );
}
