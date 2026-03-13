import { generateImageUrl } from "@imgproxy/imgproxy-node";

import type { Options } from "@imgproxy/imgproxy-js-core";

const IMGPROXY_URL = "https://imgproxy.attic.sh";

function createImgproxyUrl({ src, options }: { src: string; options: Options }): string {
  return generateImageUrl({
    endpoint: IMGPROXY_URL,
    url: {
      value: src,
      displayAs: "plain",
    },
    options,
  });
}

export { createImgproxyUrl };
