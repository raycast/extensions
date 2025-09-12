import { action, atom, reatomAsync, withAssign } from "@reatom/framework";
import axios from "axios";
import { api } from "../api";
import { FileType, FileSource } from "../api/types";

export type UploadStatus = "idle" | "preparing" | "uploading" | "finalizing" | "completed" | "error";

type UploadOptions = {
  disableThumbnail?: boolean;
  isPrivate?: boolean;
};

export type FileWithPreview = File & { preview?: string };

const extractEtagFromHeaders = (headers: Record<string, any>) => {
  const etag = headers.etag || headers.ETag || headers["etag"];
  if (!etag) return `""`;
  if (typeof etag === "string") return etag;
  return etag.toString();
};

const uploadFileChunk = async (params: {
  url: string;
  data: ArrayBuffer;
  onProgress: (progress: number) => void;
  signal?: AbortSignal;
}) => {
  const { url, data, onProgress, signal } = params;

  const response = await axios.request({
    method: "PUT",
    url,
    data,
    signal,
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total) {
        const progress = progressEvent.loaded / progressEvent.total;
        onProgress(progress);
      }
    },
  });

  if (response.status !== 200) {
    throw new Error("Failed to upload chunk");
  }

  return JSON.parse(extractEtagFromHeaders(response.headers)) as string;
};

// const detectFileType = (mimeType: string): FileType => {
//   if (mimeType.startsWith("image/")) {
//     if (mimeType === "image/gif") return FileType.Gif;
//     return FileType.Image;
//   }
//   if (mimeType.startsWith("video/")) return FileType.Video;
//   return FileType.Unknown;
// };

export const createUploadPrimitives = (id: string, data?: UploadOptions) => {
  const { disableThumbnail = false, isPrivate = false } = data ?? {};

  // Basic file state
  const fileAtom = atom<FileWithPreview | null>(null, `${id}.file`);
  const fileIdAtom = atom<string | null>(null, `${id}.fileId`);
  const disableThumbnailAtom = atom<boolean>(disableThumbnail, `${id}.disableThumbnail`);
  const isPrivateAtom = atom<boolean>(isPrivate, `${id}.isPrivate`);
  const fileTypeAtom = atom<FileType | null>(null, `${id}.fileType`);
  const metadataAtom = atom<Record<string, any> | null>(null, `${id}.metadata`);

  // Upload state
  const statusAtom = atom<UploadStatus>("idle", `${id}.status`);
  const progressAtom = atom(0, `${id}.progress`);
  const errorAtom = atom<Error | null>(null, `${id}.error`);

  // Chunk tracking
  const totalChunksAtom = atom(0, `${id}.totalChunks`);
  const currentChunkAtom = atom(0, `${id}.currentChunk`);
  const completedChunksAtom = atom<Array<{ eTag: string; partNumber: number }>>([], `${id}.completedChunks`);
  const uploadInfoAtom = atom<{
    chunkCount: number;
    chunkSize: number;
    fileUploadId: string;
    uploadPartUrls: Array<{ url: string; partNumber: number }>;
  } | null>(null, `${id}.uploadInfo`);

  // Reset action
  const resetUploadState = action((ctx) => {
    fileIdAtom(ctx, null);
    metadataAtom(ctx, null);
    statusAtom(ctx, "idle");
    progressAtom(ctx, 0);
    errorAtom(ctx, null);
    totalChunksAtom(ctx, 0);
    currentChunkAtom(ctx, 0);
    completedChunksAtom(ctx, []);
    uploadInfoAtom(ctx, null);
  }, `${id}.resetUploadState`);

  const reset = action((ctx) => {
    fileAtom(ctx, null);
    resetUploadState(ctx);
  }, `${id}.reset`);

  // Prepare file upload
  const prepareUpload = reatomAsync(
    async (
      ctx,
      options: {
        file: FileWithPreview;
        metadata: string;
        fileType: FileType;
        source: FileSource;
        deviceId: string;
      },
    ) => {
      const { file, metadata, fileType, source, deviceId } = options;

      statusAtom(ctx, "preparing");
      errorAtom(ctx, null);

      const isPrivate = ctx.get(isPrivateAtom);
      fileAtom(ctx, file);
      fileTypeAtom(ctx, fileType);

      try {
        const response = await api.assets.prepareNewFile({
          metadata,
          deviceId,
          type: fileType,
          source,
          fileSize: file.size,
          isPrivate,
        });

        if (response.status !== "ok") {
          throw new Error("Failed to prepare file upload");
        }

        fileIdAtom(ctx, response.fileId);
        uploadInfoAtom(ctx, {
          chunkCount: response.chunkCount,
          chunkSize: response.chunkSize,
          fileUploadId: response.fileUploadId,
          uploadPartUrls: response.uploadPartUrls,
        });
        totalChunksAtom(ctx, response.chunkCount);

        return response;
      } catch (error) {
        statusAtom(ctx, "error");
        errorAtom(ctx, error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    },
    { name: `${id}.prepareUpload` },
  ).pipe(
    withAssign((original) => ({
      loadingAtom: atom((ctx) => ctx.spy(original.pendingAtom) > 0),
    })),
  );

  // Upload a single chunk
  const uploadChunk = reatomAsync(
    async (ctx, chunkIndex: number) => {
      const file = ctx.get(fileAtom);
      const uploadInfo = ctx.get(uploadInfoAtom);

      if (!file || !uploadInfo) {
        throw new Error("File or upload info not available");
      }

      currentChunkAtom(ctx, chunkIndex + 1);

      const part = uploadInfo.uploadPartUrls[chunkIndex];
      if (!part) {
        throw new Error("Invalid chunk index");
      }

      const { url, partNumber } = part;
      const { chunkSize } = uploadInfo;

      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const buffer = await file.slice(start, end).arrayBuffer();

      let retries = 3;
      while (retries > 0) {
        try {
          const eTag = await uploadFileChunk({
            url,
            data: buffer,
            onProgress: (chunkProgress) => {
              const overallProgress = (chunkIndex + chunkProgress) / uploadInfo.chunkCount;
              progressAtom(ctx, overallProgress);
            },
          });

          completedChunksAtom(ctx, (prev) => [...prev, { eTag, partNumber }]);

          return { eTag, partNumber };
        } catch (error) {
          retries--;
          if (retries === 0) {
            statusAtom(ctx, "error");
            errorAtom(ctx, error instanceof Error ? error : new Error(String(error)));
            throw new Error(`Failed to upload chunk ${chunkIndex + 1}`);
          }
        }
      }

      // This should never be reached, but TypeScript needs it
      throw new Error(`Failed to upload chunk ${chunkIndex + 1} - all retries exhausted`);
    },
    { name: `${id}.uploadChunk` },
  );

  // Upload all chunks
  const uploadAllChunks = reatomAsync(
    async (ctx) => {
      const uploadInfo = ctx.get(uploadInfoAtom);

      if (!uploadInfo) {
        throw new Error("Upload info not available");
      }

      statusAtom(ctx, "uploading");

      const results: Array<{ eTag: string; partNumber: number }> = [];
      for (let i = 0; i < uploadInfo.chunkCount; i++) {
        try {
          const result = await uploadChunk(ctx, i);
          results.push(result);
        } catch (error) {
          statusAtom(ctx, "error");
          throw error;
        }
      }

      return results;
    },
    { name: `${id}.uploadAllChunks` },
  );

  // Finalize upload
  const finalizeUpload = reatomAsync(
    async (ctx) => {
      const fileId = ctx.get(fileIdAtom);
      const file = ctx.get(fileAtom);
      const completedChunks = ctx.get(completedChunksAtom);
      const disableThumbnail = ctx.get(disableThumbnailAtom);

      if (!fileId || !file || completedChunks.length === 0) {
        throw new Error("Missing data for upload finalization");
      }

      statusAtom(ctx, "finalizing");

      try {
        const response = await api.assets.completeUpload({
          fileId,
          chunks: completedChunks,
          mimeType: file.type,
          disableThumbnail,
        });

        if (response.status !== "ok") {
          throw new Error("Failed to finalize upload");
        }

        statusAtom(ctx, "completed");
        return response;
      } catch (error) {
        statusAtom(ctx, "error");
        errorAtom(ctx, error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    },
    { name: `${id}.finalizeUpload` },
  ).pipe(
    withAssign((original) => ({
      loadingAtom: atom((ctx) => ctx.spy(original.pendingAtom) > 0),
    })),
  );

  return {
    // State atoms
    fileAtom,
    fileIdAtom,
    fileTypeAtom,
    metadataAtom,
    statusAtom,
    progressAtom,
    errorAtom,
    totalChunksAtom,
    currentChunkAtom,
    completedChunksAtom,
    uploadInfoAtom,

    // Actions
    reset,
    resetUploadState,
    prepareUpload,
    uploadChunk,
    uploadAllChunks,
    finalizeUpload,
  };
};
