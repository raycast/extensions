import { CloudProviderAccount, CloudProviderType } from "../cloudProviders";
import { uploadToS3, MAX_PRESIGN_EXPIRY } from "../uploaders/s3Uploader";
import { uploadToBunny } from "../uploaders/bunnyUploader";
import type { RecentUpload } from "./recentUploads";

export type UploadedLink = RecentUpload;

type UploadOptions = {
  /**
   * Expiry in seconds for presigned URLs (S3 private).
   * If omitted, a sensible default (MAX_PRESIGN_EXPIRY) is used for private S3 uploads.
   */
  expiry?: number;
};

export async function uploadSingleFile(
  provider: CloudProviderAccount,
  filePath: string,
  options: UploadOptions = {},
): Promise<UploadedLink> {
  const fileName = filePath.split("/").pop() || filePath;
  let url = "";
  let type: "public" | "presigned" = "public";
  let expiryValue: number | undefined = undefined;

  if (provider.providerType === CloudProviderType.S3) {
    if (provider.accessLevel === "public") {
      type = "public";
      url = await uploadToS3(provider, filePath, provider.defaultPath, 0);
    } else {
      type = "presigned";
      const requestedExpiry = options.expiry ?? MAX_PRESIGN_EXPIRY;
      expiryValue = Math.min(requestedExpiry, MAX_PRESIGN_EXPIRY);
      url = await uploadToS3(provider, filePath, provider.defaultPath, expiryValue);
    }
  } else if (provider.providerType === CloudProviderType.BunnyCDN) {
    url = await uploadToBunny(provider, filePath, provider.defaultPath);
    type = provider.accessLevel === "public" ? "public" : "presigned";
  } else {
    throw new Error("Unsupported provider type");
  }

  return {
    file: fileName,
    url,
    uploadedAt: Date.now(),
    type,
    expiry: expiryValue,
  };
}
