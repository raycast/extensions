import fs from "node:fs/promises";
import path from "node:path";
import mime from "mime-types";
import type { BucketProfile, Preferences } from "./types";
import { buildObjectKey } from "./key-template";
import { createR2Client, putObject } from "./r2";
import { joinUrl } from "./url";

export type UploadSource =
  | { kind: "file-path"; filePath: string }
  | { kind: "buffer"; buffer: Buffer; originalFileName: string };

export async function uploadToR2(params: {
  prefs: Pick<Preferences, "accountId" | "accessKeyId" | "secretAccessKey" | "customDomain" | "autoCopyUrl">;
  bucket: string;
  keyConfig?: Pick<BucketProfile, "keyTemplate" | "pathPrefix" | "filenameTemplate">;
  publicBaseUrl: string;
  source: UploadSource;
}): Promise<{ bucket: string; key: string; url: string }> {
  const { prefs, bucket, keyConfig, publicBaseUrl, source } = params;

  const originalFileName =
    source.kind === "file-path" ? path.basename(source.filePath) : source.originalFileName || "clipboard.bin";

  const key = buildObjectKey({
    keyTemplate: keyConfig?.keyTemplate,
    pathPrefix: keyConfig?.pathPrefix,
    filenameTemplate: keyConfig?.filenameTemplate,
    input: { originalFileName },
  });

  const contentType = (mime.lookup(originalFileName) || undefined) as string | undefined;

  const body = source.kind === "file-path" ? await fs.readFile(source.filePath) : (source.buffer as unknown as Buffer);

  const client = createR2Client(prefs);
  await putObject({ client, bucket, key, body, contentType });
  const url = joinUrl(publicBaseUrl, key);

  return { bucket, key, url };
}
