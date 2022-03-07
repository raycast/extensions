import { Detail } from "@raycast/api";

import { useDecodedGif } from "../hooks/useDecodedGif";
import { useGifFrames } from "../hooks/useGifFrames";
import type { IGif } from "../models/gif";

export function GifDetails(props: { item: IGif; index: number }) {
  const { frames = [], isDecoded } = useDecodedGif(props.item.gif_url, props.item.slug);
  const { currentFrame } = useGifFrames(0, frames, 60);

  const md = `<img src="${currentFrame}">`;

  return <Detail isLoading={!isDecoded} navigationTitle={props.item.title} markdown={md} />;
}
