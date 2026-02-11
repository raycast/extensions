import { Action, Icon, showToast, Toast } from "@raycast/api";
import { ManifestData } from "image-shield";
import pLimit from "p-limit";
import {
  generateFragmentFileName,
  generateRestoredFileName,
  generateRestoredOriginalFileName,
} from "image-shield/dist/utils/helpers";
import { writeEncryptedImage, writeManifest, writeRestoredImage } from "../utils/helpers";
import { MANIFEST_FILE_NAME, CONCURRENCY_LIMIT } from "../constraints";

interface DownloadActionProps {
  manifest: ManifestData;
  imageBuffers: Buffer[];
  workdir?: string;
  isFragmented?: boolean;
}

export function DownloadAllImagesAction({
  manifest,
  imageBuffers,
  workdir,
  isFragmented = false,
}: DownloadActionProps) {
  return (
    <Action
      title="Download All"
      icon={{ source: Icon.Download }}
      onAction={async () => {
        if (isFragmented) {
          await writeManifest(manifest, MANIFEST_FILE_NAME, workdir);
          const limit = pLimit(CONCURRENCY_LIMIT);
          await Promise.all(
            imageBuffers.map(async (imageBuffer, i) => {
              return limit(async () => {
                const fileName = generateFragmentFileName(manifest, i);
                await writeEncryptedImage(manifest, imageBuffer, fileName, workdir);
              });
            }),
          );
        } else {
          const limit = pLimit(CONCURRENCY_LIMIT);
          await Promise.all(
            imageBuffers.map(async (imageBuffer, i) => {
              return limit(async () => {
                const imageInfo = manifest.images[i] ?? {};
                const fileName = generateRestoredOriginalFileName(imageInfo) ?? generateRestoredFileName(manifest, i);
                await writeRestoredImage(manifest, imageBuffer, fileName, workdir);
              });
            }),
          );
        }
        await showToast({
          title: "Downloaded",
          message: "All files downloaded successfully.",
          style: Toast.Style.Success,
        });
      }}
    />
  );
}

export function DownloadImageAction({
  manifest,
  imageBuffer,
  fileName,
  workdir,
  isFragmented = false,
}: DownloadActionProps & { imageBuffer: Buffer; fileName: string }) {
  return (
    <Action
      title="Download"
      icon={{ source: Icon.Download }}
      onAction={async () => {
        if (isFragmented) {
          await writeEncryptedImage(manifest, imageBuffer, fileName, workdir);
        } else {
          await writeRestoredImage(manifest, imageBuffer, fileName, workdir);
        }
        await showToast({
          title: "Downloaded",
          message: "Image downloaded successfully.",
          style: Toast.Style.Success,
        });
      }}
    />
  );
}
