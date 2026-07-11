import { getObjectBlobUrl, getObjectScreenshotUrl, getObjectThumbnailUrl } from "./api";
import { getObjectUrl } from "./object-info";
import { getLinkPreview } from "./link-preview";
import { MyMindObject } from "./types";

export type ObjectDetailAssets = {
  blobUrl?: string;
  screenshotUrl?: string;
  thumbnailUrl?: string;
  linkPreviewImageUrl?: string;
};

export async function loadObjectDetailAssets(
  object: MyMindObject,
  options?: {
    thumbnailSize?: string;
  },
): Promise<ObjectDetailAssets> {
  const objectUrl = getObjectUrl(object);
  const thumbnailSize = options?.thumbnailSize ?? "1400x1400";
  const [blobUrl, screenshotUrl, thumbnailUrl] = await Promise.all([
    object.blob ? getObjectBlobUrl(object.id).catch(() => undefined) : Promise.resolve(undefined),
    object.screenshot || objectUrl
      ? getObjectScreenshotUrl(object.id).catch(() => undefined)
      : Promise.resolve(undefined),
    object.blob || objectUrl
      ? getObjectThumbnailUrl(object.id, thumbnailSize).catch(() => undefined)
      : Promise.resolve(undefined),
  ]);

  const linkPreview = objectUrl ? await getLinkPreview(objectUrl).catch(() => undefined) : undefined;

  return {
    blobUrl,
    screenshotUrl,
    thumbnailUrl,
    linkPreviewImageUrl: linkPreview?.imageUrl,
  };
}
