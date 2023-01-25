import { readFileSync } from "fs";
import path from "path";
import { UploadFile } from "@linear/sdk";
import { getLinearClient } from "../helpers/withLinearClient";
import { fileTypeFromFile } from "file-type";

export async function uploadFile(filePath: string) {
  const { graphQLClient } = getLinearClient();

  const buffer = await readFileSync(filePath);
  const type = await fileTypeFromFile(filePath);
  const file = new Blob([buffer], { type: type?.mime });
  const name = path.basename(filePath);

  const { data } = await graphQLClient.rawRequest<
    {
      fileUpload: { uploadFile: UploadFile };
    },
    Record<string, unknown>
  >(
    `
      mutation {
        fileUpload(size: ${file.size}, contentType: "${file.type}", filename: "${name}") {
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
    `
  );

  const uploadFile = data?.fileUpload.uploadFile;

  const authHeader = uploadFile?.headers[0];
  const uploadUrl = uploadFile?.uploadUrl;

  if (uploadUrl && authHeader?.key && authHeader?.value) {
    const options = {
      method: "PUT",
      headers: {
        [authHeader?.key]: authHeader?.value,
        "Content-Type": file.type,
      },
      body: buffer,
    };

    await fetch(uploadUrl, options);

    return { assetUrl: uploadFile?.assetUrl, name };
  }
}

export type CreateAttachmentPayload = {
  issueId: string;
  url: string;
};

export async function createAttachment(payload: CreateAttachmentPayload) {
  const { graphQLClient } = getLinearClient();

  const file = await uploadFile(payload.url);

  if (!file) {
    throw new Error("Unable to upload file");
  }

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
    `
  );

  return { success: data?.attachmentCreate.success, id: data?.attachmentCreate.attachment.id };
}
