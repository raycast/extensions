import { Icon } from "@raycast/api";

export enum AssetSVCStatus {
  MEDIA_UPLOAD_INITIALIZING = 0,
  MEDIA_UPLOADING = 1,
  MEDIA_VERIFYING = 2,
  MEDIA_CONFIRMING = 3,
  MEDIA_CONFIRMED = 4,
  META_UPLOAD_INITIALIZING = 5,
  META_UPLOADING = 6,
  META_VERIFYING = 7,
  META_CONFIRMING = 8,
  META_CONFIRMED = 9,
  NFT_INITIALIZING = 10,
  NFT_SIGNING = 11,
  NFT_MINTING = 12,
  NFT_CONFIRMED = 13,
  NFT_ALL_BLOCK_CONFIRMED = 14,
}

export enum UploadStatus {
  MEDIA_UPLOAD_INITIALIZING = "MEDIA_UPLOAD_INITIALIZING",
  MEDIA_UPLOADING = "MEDIA_UPLOADING",
  MEDIA_VERIFYING = "MEDIA_VERIFYING",
  MEDIA_CONFIRMING = "MEDIA_CONFIRMING",
  MEDIA_CONFIRMED = "MEDIA_CONFIRMED",
  META_UPLOAD_INITIALIZING = "META_UPLOAD_INITIALIZING",
  META_UPLOADING = "META_UPLOADING",
  META_VERIFYING = "META_VERIFYING",
  META_CONFIRMING = "META_CONFIRMING",
  META_CONFIRMED = "META_CONFIRMED",
  NFT_INITIALIZING = "NFT_INITIALIZING",
  NFT_SIGNING = "NFT_SIGNING",
  NFT_MINTING = "NFT_MINTING",
  NFT_CONFIRMED = "NFT_CONFIRMED",
  NFT_ALL_BLOCK_CONFIRMED = "NFT_ALL_BLOCK_CONFIRMED",
}

export const transformSvcStatusToDbStatus = (status: AssetSVCStatus): UploadStatus => {
  const statusKey = AssetSVCStatus[status];
  if (!statusKey || statusKey === "UNRECOGNIZED") {
    throw new Error("UNRECOGNIZED_ASSET_STATUS");
  }
  return UploadStatus[statusKey as keyof typeof UploadStatus];
};

export const getAssetStatusIcon = (status: AssetSVCStatus): { source: string } | Icon => {
  const dbStatus = transformSvcStatusToDbStatus(status);

  switch (dbStatus) {
    case UploadStatus.NFT_CONFIRMED:
    case UploadStatus.NFT_ALL_BLOCK_CONFIRMED:
      return { source: "pixelart-source/solid-circle.svg" };

    case UploadStatus.MEDIA_UPLOAD_INITIALIZING:
    case UploadStatus.MEDIA_UPLOADING:
    case UploadStatus.MEDIA_VERIFYING:
    case UploadStatus.MEDIA_CONFIRMING:
    case UploadStatus.META_UPLOAD_INITIALIZING:
    case UploadStatus.META_UPLOADING:
    case UploadStatus.META_VERIFYING:
    case UploadStatus.META_CONFIRMING:
    case UploadStatus.NFT_INITIALIZING:
    case UploadStatus.NFT_SIGNING:
    case UploadStatus.NFT_MINTING:
      return { source: "pixelart-source/solid-loader.svg" };

    case UploadStatus.MEDIA_CONFIRMED:
    case UploadStatus.META_CONFIRMED:
      return { source: "pixelart-source/solid-circle.svg" };

    default:
      return { source: "pixelart-source/circle.svg" };
  }
};

export const getAssetStatusText = (status: AssetSVCStatus): string => {
  const dbStatus = transformSvcStatusToDbStatus(status);

  switch (dbStatus) {
    case UploadStatus.MEDIA_UPLOAD_INITIALIZING:
      return "Initializing permanentizer...";
    case UploadStatus.MEDIA_UPLOADING:
      return "Uploading media...";
    case UploadStatus.MEDIA_VERIFYING:
      return "Verifying upload...";
    case UploadStatus.MEDIA_CONFIRMING:
      return "Confirming...";
    case UploadStatus.MEDIA_CONFIRMED:
      return "Irreversible upload finalized.";
    case UploadStatus.META_UPLOAD_INITIALIZING:
      return "Initializing permanentizer...";
    case UploadStatus.META_UPLOADING:
      return "Uploading metadata...";
    case UploadStatus.META_VERIFYING:
      return "Verifying upload...";
    case UploadStatus.META_CONFIRMING:
      return "Confirming...";
    case UploadStatus.META_CONFIRMED:
      return "Irreversible upload finalized.";
    case UploadStatus.NFT_INITIALIZING:
      return "Mapping smart-contract methods...";
    case UploadStatus.NFT_SIGNING:
      return "Signing Transaction...";
    case UploadStatus.NFT_MINTING:
      return "Minting NFT...";
    case UploadStatus.NFT_CONFIRMED:
      return "NFT minted.";
    case UploadStatus.NFT_ALL_BLOCK_CONFIRMED:
      return "All blocks confirmed.";
    default:
      return "Unknown status";
  }
};

export const isAssetMinted = (status: AssetSVCStatus): boolean => {
  const dbStatus = transformSvcStatusToDbStatus(status);
  return dbStatus === UploadStatus.NFT_CONFIRMED || dbStatus === UploadStatus.NFT_ALL_BLOCK_CONFIRMED;
};
