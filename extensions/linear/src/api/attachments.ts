import { readFile } from "fs/promises";
import path from "path";

import { UploadFile } from "@linear/sdk";
import { fileTypeFromFile } from "file-type";

import { getLinearClient } from "./linearClient";

const DEFAULT_CONTENT_TYPE = "application/octet-stream";

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
  const type = await fileTypeFromFile(filePath);
  const contentType = type?.mime ?? DEFAULT_CONTENT_TYPE;
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
  const { graphQLClient } = getLinearClient();

  const file = await uploadFile(payload.url);

  const attachmentInput = `issueId: "${payload.issueId}", title: "${file.name}", url: "${file.assetUrl}"`;

  const { data } = await graphQLClient.rawRequest<
    { attachmentCreate: { success: boolean; attachment: { id: string } } },
    Record<string, unknown>
  >(
    `
      mutation {
        attachmentCreate(input: { ${attachmentInput} }) {
          success
          attachment {
            id
          }
        }
      }
    `,
  );

  return { success: data?.attachmentCreate.success, id: data?.attachmentCreate.attachment.id };
}

export async function attachLinkUrl(payload: CreateAttachmentPayload) {
  const { graphQLClient } = getLinearClient();

  const attachmentInput = `issueId: "${payload.issueId}", url: "${payload.url}"`;

  const { data } = await graphQLClient.rawRequest<
    { attachmentLinkURL: { success: boolean; attachment: { id: string } } },
    Record<string, unknown>
  >(
    `
      mutation {
        attachmentLinkURL(${attachmentInput}) {
          success
          attachment {
            id
          }
        }
      }
    `,
  );

  return { success: data?.attachmentLinkURL.success, id: data?.attachmentLinkURL.attachment.id };
}
