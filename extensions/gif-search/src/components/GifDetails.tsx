import { Detail } from "@raycast/api";
import FileSizeFormat from "@saekitominaga/file-size-format";

import { GifActions } from "./GifActions";
import { IGif, renderGifMarkdownDetails } from "../models/gif";
import { getServiceFromUrl } from "../lib/getServiceFromUrl";
import { getServiceTitle } from "../preferences";

type GifDetailsProps = {
  item: IGif;
  mutate: () => Promise<void>;
};

export function GifDetails(props: GifDetailsProps) {
  const { title, metadata, attribution } = props.item;

  const service = getServiceFromUrl(props.item);

  const tags = [];
  if (metadata?.tags?.length) {
    tags.push(
      <Detail.Metadata.TagList title="tags">
        {metadata.tags.map((tag, index) => (
          <Detail.Metadata.TagList.Item text={tag} key={index} />
        ))}
      </Detail.Metadata.TagList>,
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
      actions={<GifActions item={props.item} showViewDetails={false} mutate={props.mutate} />}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Title" text={title} />
          {metadata?.width ? <Detail.Metadata.Label title="Width" text={`${metadata.width.toString()}px`} /> : null}
          {metadata?.height ? <Detail.Metadata.Label title="Height" text={`${metadata.height.toString()}px`} /> : null}
          {metadata?.size && <Detail.Metadata.Label title="Size" text={FileSizeFormat.si(metadata?.size)} />}
          {labels}
          {links}
          {tags}
          {service ? <Detail.Metadata.Label title="Source" text={getServiceTitle(service)} icon={attribution} /> : null}
        </Detail.Metadata>
      }
    />
  );
}
