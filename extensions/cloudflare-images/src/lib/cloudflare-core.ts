import { environment } from "@raycast/api";
import { createRequire } from "node:module";
import { join } from "node:path";

export type * from "@mcdays/cloudflare-images-core";

// Preserve the core package's dependency layout in assets. Bundling its JavaScript
// alone separates Sharp from the native packages and libraries it needs to load.
const requireFromAssets = createRequire(
  join(environment.assetsPath, "native", "sharp", "package.json"),
);
const core = requireFromAssets(
  "@mcdays/cloudflare-images-core",
) as typeof import("@mcdays/cloudflare-images-core");

type Core = typeof import("@mcdays/cloudflare-images-core");

export const calculateFileHash: Core["calculateFileHash"] =
  core.calculateFileHash;
export const extractImageIdFromUrl: Core["extractImageIdFromUrl"] =
  core.extractImageIdFromUrl;
export const formatImageUrl: Core["formatImageUrl"] = core.formatImageUrl;
export const buildDeliveryUrl: Core["buildDeliveryUrl"] = core.buildDeliveryUrl;
export const buildPublicUrl: Core["buildPublicUrl"] = core.buildPublicUrl;
export const generateSignedUrl: Core["generateSignedUrl"] =
  core.generateSignedUrl;
export const fetchSigningKey: Core["fetchSigningKey"] = core.fetchSigningKey;
export const resolveMetadataTemplate: Core["resolveMetadataTemplate"] =
  core.resolveMetadataTemplate;
export const resolveSignedMode: Core["resolveSignedMode"] =
  core.resolveSignedMode;
export const resolveVariant: Core["resolveVariant"] = core.resolveVariant;
export const compressImageIfNeeded: Core["compressImageIfNeeded"] =
  core.compressImageIfNeeded;
export const convertAvifIfNeeded: Core["convertAvifIfNeeded"] =
  core.convertAvifIfNeeded;
export const uploadImage: Core["uploadImage"] = core.uploadImage;
export const listImages: Core["listImages"] = core.listImages;
export const listVariants: Core["listVariants"] = core.listVariants;
export const deleteImage: Core["deleteImage"] = core.deleteImage;
export const validateCredentials: Core["validateCredentials"] =
  core.validateCredentials;
