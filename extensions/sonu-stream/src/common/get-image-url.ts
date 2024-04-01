import { Image } from "./types";
import { SIH_CLOUDFRONT_HOST } from "./constants";

export function getImageUrl({ image, size }: { image: Image; size: number }) {
  const imageSettings = JSON.stringify({
    bucket: image.bucket,
    key: image.id,
    edits: {
      quality: 0.75,
      resize: {
        width: size,
      },
    },
  });
  return `${SIH_CLOUDFRONT_HOST}/${btoa(imageSettings)}`;
}
