import { Detail } from "@raycast/api";

import { CreateVariationRequest } from "../hooks/useOpenAIImageApi";
import { ImageActions } from "./ImageActions";

export function ImageDetails(props: {
  url: string;
  opt: CreateVariationRequest & { prompt: string; variationCount?: number };
}) {
  const { url, opt } = props;

  return (
    <Detail
      markdown={`![](${props.url})`}
      actions={
        <ImageActions
          showDetailAction={false}
          url={url}
          prompt={opt.prompt}
          size={opt.size}
          n={opt.n.toString()}
          variationCount={opt.variationCount ?? 0}
        />
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Prompt" text={opt.prompt} />
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
