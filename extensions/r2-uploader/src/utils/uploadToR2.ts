import { getPreferenceValues } from "@raycast/api";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { getMimeType } from "./mime-types";
import { generateFileName, renderTemplateTokens } from "./generate-fileName";
import { createR2Client } from "./r2-client";
import { buildPublicUrl } from "./r2-url";
import { escapeMarkdownAlt, escapeHtmlAttribute } from "./text-escaping";

function buildObjectKey(fileName: string, pathPrefix: string | undefined, originalFilePath: string): string {
  if (!pathPrefix) {
    return fileName;
  }

  const renderedPrefix = renderTemplateTokens(pathPrefix, originalFilePath)
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== ".." && segment !== ".")
    .join("/");

  return renderedPrefix ? `${renderedPrefix}/${fileName}` : fileName;
}

export async function uploadToR2(
  filePath: string,
  customFileName: string | undefined,
  pathPrefixOverride?: string,
): Promise<{ url: string; markdown: string; html: string; key: string }> {
  const { fileNameFormat, uploadPathPrefix } = getPreferenceValues();
  const { client, bucketName, endpoint, customDomain } = createR2Client();

  const effectivePathPrefix = pathPrefixOverride !== undefined ? pathPrefixOverride : uploadPathPrefix;

  const fileContent = await fs.promises.readFile(filePath);

  const finalFileName =
    customFileName || (await generateFileName(filePath, fileNameFormat || "", path.extname(filePath)));
  const key = buildObjectKey(finalFileName, effectivePathPrefix, filePath);

  const contentType = getMimeType(filePath);

  const putObjectCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileContent,
    ContentType: contentType,
  });

  await client.send(putObjectCommand);

  const url = buildPublicUrl(key, { endpoint, bucketName, customDomain });

  const alt = path.basename(key, path.extname(key));
  const markdown = `![${escapeMarkdownAlt(alt)}](${url})`;
  const html = `<img src="${url}" alt="${escapeHtmlAttribute(alt)}" />`;

  return { url, markdown, html, key };
}
