import * as crypto from "crypto";
import * as fs from "fs";
import * as https from "https";
import * as path from "path";

const HOSTNAME = "transfa.sh";

export interface UploadOptions {
  ttl?: string;
  password?: string;
  maxDownloads?: number;
  apiKey?: string;
}

export interface UploadResult {
  id: string;
  url: string;
  agent_link: string;
  filename: string;
  bytes: number;
  sha256: string;
  expires_at: string;
}

function request(options: https.RequestOptions, body?: Buffer): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(Buffer.from(c)));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function authHeaders(apiKey?: string): Record<string, string> {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

function errorMessage(body: string, status: number): string {
  try {
    return JSON.parse(body).error ?? `HTTP ${status}`;
  } catch {
    return `HTTP ${status}`;
  }
}

export async function uploadFile(filePath: string, opts: UploadOptions = {}): Promise<UploadResult> {
  const boundary = crypto.randomBytes(16).toString("hex");
  const filename = path.basename(filePath);
  const escapedFilename = filename.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const fileContent = fs.readFileSync(filePath);

  const parts: Buffer[] = [];

  const field = (name: string, value: string) =>
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));

  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${escapedFilename}"\r\nContent-Type: application/octet-stream\r\n\r\n`
    )
  );
  parts.push(fileContent);
  parts.push(Buffer.from("\r\n"));

  if (opts.ttl) field("ttl", opts.ttl);
  if (opts.password) field("password", opts.password);
  if (opts.maxDownloads) field("max_downloads", String(opts.maxDownloads));

  parts.push(Buffer.from(`--${boundary}--\r\n`));

  const body = Buffer.concat(parts);

  const res = await request(
    {
      hostname: HOSTNAME,
      path: "/api/upload",
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": String(body.length),
        ...authHeaders(opts.apiKey),
      },
    },
    body
  );

  if (res.status < 200 || res.status >= 300) throw new Error(errorMessage(res.body, res.status));
  return JSON.parse(res.body) as UploadResult;
}

export async function listUploads(apiKey: string): Promise<UploadResult[]> {
  const res = await request({
    hostname: HOSTNAME,
    path: "/api/upload",
    method: "GET",
    headers: authHeaders(apiKey),
  });

  if (res.status < 200 || res.status >= 300) throw new Error(errorMessage(res.body, res.status));
  const data = JSON.parse(res.body);
  return (data.uploads ?? data) as UploadResult[];
}

export async function deleteUpload(id: string, apiKey: string): Promise<void> {
  const res = await request({
    hostname: HOSTNAME,
    path: `/api/upload/${id}`,
    method: "DELETE",
    headers: authHeaders(apiKey),
  });

  if (res.status < 200 || res.status >= 300) throw new Error(errorMessage(res.body, res.status));
}
