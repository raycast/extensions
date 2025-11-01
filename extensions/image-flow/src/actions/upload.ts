import { Config, Input, Output } from "../types";
import s3, { S3Config, S3UploadParams } from "../services/s3";
import fs from "fs";
import path from "path";
import { validateInputMustBeFilepath } from "../supports/validate";

/**
 * Upload the image to S3.
 *
 * @param i the input must be an image path
 * @param config
 * @param services
 *
 * @return uploaded image url
 */
export default async function (i: Input, config: Config, services: Record<string, Config>): Promise<Output> {
  validateInputMustBeFilepath(i);

  const uploadParams = buildUploadParams(i, config);
  const s3Config = buildS3Config(services);

  await s3.upload(uploadParams, s3Config);

  return {
    type: "url",
    value: buildImageURL(uploadParams, s3Config, config?.["cdn"] as string),
  } as Output;
}

function buildUploadParams(i: Input, config: Config): S3UploadParams {
  const root = config?.["root"] ?? "";
  const bucket = config?.["bucket"] as string;

  const body = fs.readFileSync(i.value);
  const key = [root, path.basename(i.value)].filter(Boolean).join("/");

  return { Body: body, Bucket: bucket, Key: key };
}

function buildS3Config(services: Record<string, Config>): S3Config {
  const s3Config = services?.["s3"];
  const endpoint = s3Config?.["endpoint"] as string;
  const region = s3Config?.["region"] as string;
  const accessKeyId = s3Config?.["access_key_id"] as string;
  const secretAccessKey = s3Config?.["secret_access_key"] as string;

  return {
    credentials: { accessKeyId: accessKeyId, secretAccessKey: secretAccessKey },
    region: region,
    endpoint,
  };
}

function buildImageURL(uploadParams: S3UploadParams, s3Config: S3Config, cdn?: string): string {
  if (cdn) {
    return `${cdn}/${uploadParams.Key}`;
  }

  return `https://${uploadParams.Bucket}.s3.${s3Config.region}.amazonaws.com/${uploadParams.Key}`;
}
