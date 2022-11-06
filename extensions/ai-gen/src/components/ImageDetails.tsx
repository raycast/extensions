import { Detail, useNavigation } from "@raycast/api";

import { CreateVariationRequest } from "../hooks/useOpenAIApi";
import downloadTempFile from "../lib/downloadTempFile";
import { ImagesGrid } from "./ImagesGrid";
import { ImageActions } from "./ImageActions";

export function ImageDetails(props: {
  url: string;
  opt: CreateVariationRequest & { prompt: string; variationCount?: number };
}) {
  const { url, opt } = props;

  const { push } = useNavigation();
  async function createVariationAction(url: string, count: number) {
    const file = await downloadTempFile(url);
    push(
      <ImagesGrid prompt={opt.prompt} file={file} n={opt.n.toString()} size={opt.size} variationCount={count + 1} />
    );
  }

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
