import { readFile } from "fs/promises";
import path from "path";

import { UploadFile } from "@linear/sdk";

import { getLinearClient } from "./linearClient";

const DEFAULT_CONTENT_TYPE = "application/octet-stream";

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".apng": "image/apng",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".csv": "text/csv",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".gif": "image/gif",
  ".gz": "application/gzip",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".json": "application/json",
  ".md": "text/markdown",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".svg": "image/svg+xml",
  ".tar": "application/x-tar",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".txt": "text/plain",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".zip": "application/zip",
};

function getContentType(filePath: string) {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? DEFAULT_CONTENT_TYPE;
}

type FileUploadVariables = {
  size: number;
  contentType: string;
  filename: string;
};

export type UploadedFile = {
  assetUrl: string;
  contentType: string;
  name: string;
};

export async function uploadFile(filePath: string): Promise<UploadedFile> {
  const { graphQLClient } = getLinearClient();

  const buffer = await readFile(filePath);
  const contentType = getContentType(filePath);
  const name = path.basename(filePath);

  const { data } = await graphQLClient.rawRequest<
    {
      fileUpload: { success: boolean; uploadFile?: UploadFile };
    },
    FileUploadVariables
  >(
    `
      mutation FileUpload($size: Int!, $contentType: String!, $filename: String!) {
        fileUpload(size: $size, contentType: $contentType, filename: $filename) {
          success
          uploadFile {
            headers {
              key
              value
            }
            uploadUrl
            assetUrl
          }
        }
      }
    `,
    { size: buffer.byteLength, contentType, filename: name },
  );

  const upload = data?.fileUpload.uploadFile;

  if (!data?.fileUpload.success || !upload) {
    throw new Error(`Failed to request an upload URL for "${name}"`);
  }

  const headers = new Headers({
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=31536000",
  });
  upload.headers.forEach(({ key, value }) => headers.set(key, value));

  const response = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers,
    body: buffer,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload "${name}": ${response.status} ${response.statusText}`);
  }

  return { assetUrl: upload.assetUrl, contentType, name };
}

function escapeMarkdownLabel(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("[", "\\[").replaceAll("]", "\\]");
}

export async function appendFileAttachments(markdown: string, attachmentPaths?: string[]) {
  if (!attachmentPaths?.length) {
    return markdown;
  }

  const files: UploadedFile[] = [];
  for (const filePath of attachmentPaths) {
    files.push(await uploadFile(filePath));
  }
  const attachments = files.map(({ assetUrl, contentType, name }) => {
    const label = escapeMarkdownLabel(name);
    return contentType.startsWith("image/") ? `![${label}](${assetUrl})` : `[${label}](${assetUrl})`;
  });

  return [markdown.trimEnd(), ...attachments].filter(Boolean).join("\n\n");
}

export type CreateAttachmentPayload = {
  issueId: string;
  url: string;
};

export async function createAttachment(payload: CreateAttachmentPayload) {
  const { linearClient } = getLinearClient();
  const file = await uploadFile(payload.url);
  const result = await linearClient.createAttachment({
    issueId: payload.issueId,
    title: file.name,
    url: file.assetUrl,
  });

  return { success: result.success, id: result.attachmentId };
}

export async function attachLinkUrl(payload: CreateAttachmentPayload) {
  const { linearClient } = getLinearClient();
  const result = await linearClient.attachmentLinkURL(payload.issueId, payload.url);

  return { success: result.success, id: result.attachmentId };
}
