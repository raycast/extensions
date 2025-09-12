import { AxiosError, AxiosRequestConfig } from "axios";

export type BodyType<Data> = Data;

export type ErrorType<Error> = AxiosError<Error>;

export type SomeFunction<TResult, TParameters, _TError = ErrorType<unknown>> = (
  params?: TParameters,
  options?: AxiosRequestConfig,
  signal?: AbortController | AbortSignal,
) => Promise<TResult>;

// Contracts API Types
export interface Timestamp {
  seconds: number;
  nanos: number;
}

export interface ContractEntity {
  id: string;
  userId?: string | null;
  address?: string | null;
  name: string;
  symbol: string;
  type: string;
  status: string;
  ercType: string;
  createdAt: Timestamp | null;
  lastTokenId: number;
  count?: number | null;
}

export interface UserContractsResponseDto {
  status: string;
  errorCode?: string | null;
  data: ContractEntity[];
}

// Account API Types
export interface GetCurrentUserRequestDto {
  deviceId: string;
}

export interface GetCurrentUserResponse_OK {
  userId: string;
  enablePushNotifications: boolean;
  role: "USER" | "ADMIN";
  nickname: string;
  phoneNumber: string;
  publicKey: string;
  verificationId: string;
}

export interface GetCurrentUserResponseDto {
  status: string;
  errorCode?: string | null;
  ok?: GetCurrentUserResponse_OK | null;
}

export interface CreateUserContractRequestDto {
  name: string;
  symbol: string;
  type: "ERC721" | "ERC1155";
}

export interface CreateUserContractResponseDto {
  status: string;
  errorCode?: string | null;
  data?: ContractEntity | null;
}

// Assets API Types
import { AssetSVCStatus } from "../utils/assetStatus";

export interface AssetEntity {
  id: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  mintedAt?: Timestamp | null;
  currentEditions: number;
  lockedEditions: number;
  isFinal: boolean;
  isUranium: boolean;
  inTransfer: boolean;
  isEncrypted: boolean;
  encryptMimeType?: string | null;
  sourceMimeType: string;
  collectionName: string;
  status: AssetSVCStatus;
  statusIndex: number;
  editions: number;
  ercContractType: string;
  title: string;
  slug: string;
  appName: string;
  appVersion: string;
  authorName: string;
  description?: string | null;
  source: string;
  sourceUrl: string;
  thumbnailUrl?: string | null;
  thumbnailBigUrl?: string | null;
  mediaUrl?: string | null;
  mediaType: string;
  location?: string | null;
  locationCoords?: string | null;
  mediaSize: number;
  mediaDuration?: number | null;
  contractAddress?: string | null;
  tokenId?: string | null;
  openSeaUrl?: string | null;
  creatorAddress: string;
  creatorName: string;
  currentOwnerAddress: string;
  currentOwnerName?: string | null;
  isHasSecret: boolean;
  contractId: string;
  fileId: string;
  userId?: string | null;
  ownerId?: string | null;
  newOwnerId?: string | null;
  batchUploadId?: string | null;
  encryptedViewLink?: string | null;
  slugHash: string;
  transferStatus?: string | null;
  currentTransferId?: string | null;
  isListed: boolean;
}

export interface FindUserAssetsRequestDto {
  contractId?: string;
  pageSize?: number;
  page?: number;
  sortBy?: string;
  order?: "desc" | "asc";
  quickFilter?: string;
}

export interface FindUserAssetsMetadata {
  total: number;
  page: number;
  pageSize: number;
  countPages: number;
}

export interface FindUserAssetsResponseData {
  data: AssetEntity[];
  meta: FindUserAssetsMetadata | null;
}

export interface FindUserAssetsResponseDto {
  status: string;
  errorCode?: string | null;
  ok?: FindUserAssetsResponseData | null;
}

// File Upload Types
export enum FileType {
  Image = "image",
  Video = "video",
  Gif = "gif",
  Unknown = "unknown",
}

export enum FileSource {
  Camera = "camera",
  Gallery = "gallery",
  Upload = "upload",
}

export interface PrepareNewFileRequestDto {
  deviceId: string;
  metadata: string;
  type: FileType;
  source: FileSource;
  fileSize: number;
  isPrivate?: boolean | null | undefined;
}

export interface UploadPartUrl {
  partNumber: number;
  url: string;
}

export interface PrepareNewFileResponseDto {
  status: string;
  fileId: string;
  fileUploadId: string;
  chunkCount: number;
  chunkSize: number;
  uploadPartUrls: UploadPartUrl[];
}

export interface CompleteUploadChunkRequest {
  partNumber: number;
  eTag: string;
}

export interface CompleteUploadRequestDto {
  fileId: string;
  mimeType: string;
  chunks: CompleteUploadChunkRequest[];
  disableThumbnail?: boolean | null | undefined;
}

export interface CompleteUploadResponseDto {
  status: string;
}

// Start Minting Types
export enum Metadata_AttributeType {
  STRING = 0,
  NUMBER = 1,
  BOOLEAN = 2,
  UNRECOGNIZED = -1,
}

export interface Metadata_AttributeDto {
  key: string;
  value: string;
  type: Metadata_AttributeType;
}

export interface MetadataDto {
  attributes: Metadata_AttributeDto[];
}

export interface MintProgressInfoEntity {
  totalChunks?: number;
  completedChunks?: number;
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

export interface StartMintingRequestDto {
  fileId: string;
  editions?: number | undefined | null;
  batchOrder?: number | undefined | null;
  contractId?: string | undefined | null;
  batchId?: string | undefined | null;
  shareWithCommunity?: boolean | undefined | null;
  isEncrypted?: boolean | undefined | null;
  encryptMimeType?: string | undefined | null;
  metadata: MetadataDto;
}

export interface StartMintingResponseDataDto {
  status: UploadStatus;
  mintProgressInfo: MintProgressInfoEntity;
  contractAddress?: string | null;
  tokenId?: string | null;
}

export interface StartMintingResponseDto {
  status: string;
  errorCode?: string | null;
  data?: StartMintingResponseDataDto | null;
}
