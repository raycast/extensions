import type { Image } from "@raycast/api";

export function resolveSpaceIcon(
  iconData: string | null | undefined,
): Image.ImageLike | undefined {
  return iconData ? { source: `data:image/png;base64,${iconData}` } : undefined;
}
