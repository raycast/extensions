import path from "path";
import { URL } from "url";

import { Detail } from "@raycast/api";

import { CreateVariationRequest } from "../hooks/useOpenAIImageApi";
import { ImageActions } from "./ImageActions";

export function ImageDetails(props: {
  url: string;
  opt: CreateVariationRequest & { prompt?: string; variationCount?: number; image?: string; mask?: string };
}) {
  const { url, opt } = props;
  let imageFile = "";
  if (opt.image) {
    imageFile = path.basename(opt.image);
  }

  let maskFile = "";
  if (opt.mask) {
    maskFile = path.basename(opt.mask);
  }

  return (
    <Detail
      markdown={`![](${props.url})`}
      actions={
        <ImageActions
          showDetailAction={false}
          url={url}
          prompt={opt.prompt}
          image={opt.image}
          mask={opt.mask}
          size={opt.size}
          n={opt.n.toString()}
          variationCount={opt.variationCount ?? 0}
        />
      }
      metadata={
        <Detail.Metadata>
          {opt.prompt ? <Detail.Metadata.Label title="Prompt" text={opt.prompt} /> : null}
          {imageFile && opt.image ? (
            <Detail.Metadata.Link title="Original Image" text={imageFile} target={"file:///" + opt.image} />
          ) : null}
          {maskFile && opt.mask ? (
            <Detail.Metadata.Link title="Mask" text={maskFile} target={"file:///" + opt.mask} />
          ) : null}
          <Detail.Metadata.Label title="Size" text={opt.size} />
          <Detail.Metadata.Label
            title="Variation"
            text={opt.variationCount ? opt.variationCount.toString() : "Original"}
          />
        </Detail.Metadata>
      }
    />
  );
}
