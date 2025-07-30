import { ImageFragmenter, ImageRestorer, type ManifestData, FragmentationConfig } from "image-shield";
import { readJsonFile } from "image-shield/dist/utils/file";
import { verifySecretKey } from "image-shield/dist/utils/helpers";
import { MANIFEST_FILE_NAME } from "../constraints";

export async function readManifest(manifestPath: string) {
  return await readJsonFile<ManifestData>(manifestPath);
}

export function validateEncryptFiles(imagePaths?: string[]) {
  if (!imagePaths || imagePaths.length === 0) throw new Error("Target image files are required");
  return { imagePaths };
}

export function validateDecryptFiles(manifest?: ManifestData, imagePaths?: string[]) {
  if (!manifest) throw new Error(`${MANIFEST_FILE_NAME} is required`);
  if (!imagePaths || imagePaths.length === 0) throw new Error("Target image files are required");
  if (manifest.images.length !== imagePaths.length)
    throw new Error(`Number of image files does not match: ${imagePaths.length} / ${manifest.images.length}`);
  return { manifest, imagePaths };
}

export async function encryptImagesWithKey(config: FragmentationConfig, imagePaths: string[], secretKey?: string) {
  const encryptor = new ImageFragmenter(config, verifySecretKey(secretKey));
  return await encryptor.fragmentImages(imagePaths);
}

export async function restoreImagesWithKey(imagePaths: string[], manifest: ManifestData, secretKey?: string) {
  const restorer = new ImageRestorer(verifySecretKey(secretKey));
  return await restorer.restoreImages(imagePaths, manifest);
}
