import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export interface S3Config {
  region: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  endpoint?: string;
}

export interface S3UploadParams {
  Bucket: string;
  Key: string;
  Body: Buffer;
}

async function upload(uploadParams: S3UploadParams, config: S3Config): Promise<void> {
  const s3Client = new S3Client(config);

  const command = new PutObjectCommand(uploadParams);
  await s3Client.send(command);
}

export default {
  upload,
};
