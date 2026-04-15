import { writeFile } from "node:fs/promises";

import { ExtensionConfig } from "./config-core";
import { compressToTarget } from "./compress";
import { buildObjectKey, cleanupFile, createTempFilePath, moveToFailureDirectory } from "./paths";
import { uploadWithRetry } from "./storage";
import { buildPublicUrl } from "./url";

type CompressedExtension = "webp" | "jpg";

export interface ImageUploadResult {
  publicUrl: string;
  objectKey: string;
  bytes: number;
  format: "webp" | "jpeg";
  extension: CompressedExtension;
  attempts: number;
}

export interface ImageUploadOptions {
  onCompressed?: () => void;
  onUploading?: () => void;
}

export class ImageUploadFailedError extends Error {
  constructor(
    public readonly compressedPath: string,
    public readonly objectKey: string,
    public readonly extension: CompressedExtension,
    public readonly cause: unknown,
  ) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = "ImageUploadFailedError";
  }
}

export async function uploadImageFile(
  config: ExtensionConfig,
  sourcePath: string,
  options: ImageUploadOptions = {},
): Promise<ImageUploadResult> {
  let compressedPath: string | undefined;
  let objectKey: string | undefined;
  let extension: CompressedExtension = "webp";
  let shouldCleanupCompressedPath = true;
  const uploadDate = new Date();

  try {
    const compressedImage = await compressToTarget(sourcePath, config.maxUploadBytes);
    options.onCompressed?.();
    extension = compressedImage.extension;
    compressedPath = await createTempFilePath(extension);
    await writeFile(compressedPath, compressedImage.buffer);

    objectKey = buildObjectKey(config.keyPrefix, uploadDate, extension);
    options.onUploading?.();
    const uploadResult = await uploadWithRetry(config, {
      objectKey,
      body: compressedImage.buffer,
      contentType: compressedImage.contentType,
    });

    return {
      publicUrl: buildPublicUrl(config.publicBaseUrl, objectKey),
      objectKey,
      bytes: compressedImage.bytes,
      format: compressedImage.format,
      extension,
      attempts: uploadResult.attempts,
    };
  } catch (error: unknown) {
    if (compressedPath) {
      shouldCleanupCompressedPath = false;
      throw new ImageUploadFailedError(
        compressedPath,
        objectKey ?? buildObjectKey(undefined, uploadDate, extension),
        extension,
        error,
      );
    }

    throw error;
  } finally {
    if (shouldCleanupCompressedPath) {
      await cleanupFile(compressedPath);
    }
  }
}

export async function saveFailedUpload(error: ImageUploadFailedError): Promise<string> {
  return moveToFailureDirectory(error.compressedPath, error.objectKey);
}
