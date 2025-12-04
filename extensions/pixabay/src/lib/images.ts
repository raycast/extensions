import type { Hit } from "@/types";

export function getLargeFileExtension(hit: Hit): string {
  const last = hit.largeImageURL.split(".").slice(-1)[0];
  if (last && last.length > 0) {
    return last;
  } else {
    return "png";
  }
}
