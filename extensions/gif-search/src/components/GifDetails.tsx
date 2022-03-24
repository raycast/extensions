import { Detail } from "@raycast/api";
import FileSizeFormat from "@saekitominaga/file-size-format";

import { IGif, renderGifMarkdownDetails } from "../models/gif";

export function GifDetails(props: { item: IGif }) {
  const { metadata } = props.item;

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
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Width" text={metadata?.width.toString()} />
          <Detail.Metadata.Label title="Height" text={metadata?.height.toString()} />
          {metadata?.size && <Detail.Metadata.Label title="Size" text={FileSizeFormat.si(metadata?.size)} />}
          {labels}
          {links}
          {tags}
        </Detail.Metadata>
      }
    />
  );
}
