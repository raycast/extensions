import path from "path";
import { URL } from "url";

import { Detail } from "@raycast/api";

import { CreateVariationRequest } from "../hooks/useOpenAIImageApi";
import { ImageActions } from "./ImageActions";

export function ImageDetails(props: {
  url: string;
  opt: CreateVariationRequest & { prompt?: string; variationCount?: number; image?: string };
}) {
  const { url, opt } = props;
  let fileName = "";
  if (opt.image) {
    fileName = path.basename(opt.image);
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
          size={opt.size}
          n={opt.n.toString()}
          variationCount={opt.variationCount ?? 0}
        />
      }
      metadata={
        <Detail.Metadata>
          {opt.prompt ? (
            <Detail.Metadata.Label title="Prompt" text={opt.prompt} />
          ) : fileName && opt.image ? (
            <Detail.Metadata.Link title="Original Image" text={fileName} target={"file:///" + opt.image} />
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
