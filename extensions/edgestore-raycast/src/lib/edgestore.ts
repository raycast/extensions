import { edgeStoreRawSdk } from "@edgestore/server/core";
import { getBucket } from "./storage";
import https from "https";

export async function uploadFile({
  bucketRefId,
  file,
  onProgressChange,
}: {
  bucketRefId: string;
  file: File;
  onProgressChange?: (progress: number) => void;
}) {
  const config = await getBucket(bucketRefId);
  if (!config) {
    throw new Error("Bucket not found");
  }

  const { signedUrl, accessUrl } = await edgeStoreRawSdk.requestUpload({
    bucketName: config.bucketName,
    bucketType: "FILE",
    fileInfo: {
      fileName: file.name,
      extension: getFileExtension(file),
      isPublic: true,
      path: [],
      metadata: {},
      temporary: config.temporaryFiles ?? false,
      type: file.type,
      size: file.size,
    },
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });

  if (!signedUrl) {
    throw new Error("Failed to get signed URL");
  }

  await uploadFileInner({
    file,
    uploadUrl: signedUrl,
    onProgressChange,
  });

  return accessUrl;
}

async function uploadFileInner({
  file,
  uploadUrl,
  onProgressChange,
  signal,
}: {
  file: File;
  uploadUrl: string;
  onProgressChange?: (progress: number) => void;
  signal?: AbortSignal;
}) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("File upload aborted"));
      return;
    }

    // Convert File to Buffer for Node.js
    file
      .arrayBuffer()
      .then((arrayBuffer) => {
        const buffer = Buffer.from(arrayBuffer);
        const totalSize = buffer.length;
        let uploadedSize = 0;

        onProgressChange?.(0);

        const options = {
          method: "PUT",
          headers: {
            "Content-Length": totalSize,
            "Content-Type": file.type || "application/octet-stream",
          },
        };

        const request = https.request(uploadUrl, options, (response) => {
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            onProgressChange?.(100);
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${response.statusCode}`));
          }
        });

        request.on("error", (error) => {
          reject(new Error(`Error uploading file: ${error.message}`));
        });

        if (signal) {
          signal.addEventListener("abort", () => {
            request.destroy();
            reject(new Error("File upload aborted"));
          });
        }

        // Track upload progress by splitting the buffer into chunks
        const chunkSize = 64 * 1024; // 64KB chunks
        let offset = 0;

        const writeNextChunk = () => {
          if (offset >= totalSize) {
            request.end();
            return;
          }

          const chunk = buffer.subarray(offset, Math.min(offset + chunkSize, totalSize));
          const canContinue = request.write(chunk);

          uploadedSize += chunk.length;
          const progress = Math.round((uploadedSize / totalSize) * 10000) / 100;
          onProgressChange?.(progress);

          offset += chunk.length;

          if (canContinue) {
            writeNextChunk();
          } else {
            request.once("drain", writeNextChunk);
          }
        };

        writeNextChunk();
      })
      .catch((error) => {
        reject(new Error(`Failed to read file: ${error.message}`));
      });
  });
}

function getFileExtension(file: File) {
  // First try to get extension from file name
  const nameExtension = file.name.split(".").pop();
  if (nameExtension && nameExtension !== file.name) {
    return nameExtension;
  }

  // If no extension from name, try to derive from MIME type
  if (file.type) {
    const mimeToExtension: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/svg+xml": "svg",
      "text/plain": "txt",
      "text/html": "html",
      "text/css": "css",
      "text/javascript": "js",
      "application/javascript": "js",
      "application/json": "json",
      "application/pdf": "pdf",
      "application/zip": "zip",
      "application/x-zip-compressed": "zip",
      "video/mp4": "mp4",
      "video/mpeg": "mpeg",
      "video/quicktime": "mov",
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
      "audio/ogg": "ogg",
    };

    const extension = mimeToExtension[file.type];
    if (extension) {
      return extension;
    }
  }

  // If we can't figure it out, return empty string
  return "";
}
