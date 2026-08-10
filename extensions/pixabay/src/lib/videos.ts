import type { VideoHit, Videos } from "@/types";

export function getPreviewUrl(hit: VideoHit, size?: keyof Videos): string {
  const s: keyof Videos = size ? size : "small";
  return hit.videos[s].thumbnail;
}
