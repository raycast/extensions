import { getPreferenceValues } from "@raycast/api";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { getMimeType } from "./mime-types";
import { generateFileName, renderTemplateTokens } from "./generate-fileName";
import { createR2Client } from "./r2-client";
import { formatPublicLinks, getPublicBaseUrl } from "./r2-url";

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

export async function uploadToR2(filePath: string, pathPrefixOverride?: string) {
  const { fileNameFormat, uploadPathPrefix } = getPreferenceValues();
  const { client, bucketName, customDomain } = createR2Client();
  const publicBaseUrl = getPublicBaseUrl(customDomain);

  const effectivePathPrefix = pathPrefixOverride !== undefined ? pathPrefixOverride : uploadPathPrefix;

  const fileStats = await fs.promises.stat(filePath);
  if (!fileStats.isFile()) {
    throw new Error("Select files in Finder. Folders cannot be uploaded.");
  }

  const finalFileName = fileNameFormat
    ? await generateFileName(filePath, fileNameFormat)
    : `${path.basename(filePath, path.extname(filePath))}_${Date.now()}_${randomUUID().slice(0, 8)}${path.extname(filePath)}`;
  const key = buildObjectKey(finalFileName, effectivePathPrefix, filePath);

  const contentType = getMimeType(filePath);

  const fileStream = fs.createReadStream(filePath);
  const putObjectCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileStream,
    ContentLength: fileStats.size,
    ContentType: contentType,
    IfNoneMatch: fileNameFormat ? undefined : "*",
  });

  try {
    await client.send(putObjectCommand);
  } finally {
    fileStream.destroy();
  }

  return formatPublicLinks(key, publicBaseUrl);
}
