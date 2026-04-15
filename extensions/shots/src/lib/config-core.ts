const DEFAULT_MAX_UPLOAD_BYTES = 1_048_576;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_REGION = "auto";
const FIELD_LABELS: Record<string, string> = {
  endpoint: "S3 Endpoint",
  bucket: "Bucket",
  region: "Region",
  accessKeyId: "Access Key ID",
  secretAccessKey: "Secret Access Key",
  publicBaseUrl: "Public Base URL",
  maxUploadBytes: "Compression Target Bytes",
  maxRetries: "Upload Retries",
};

export interface RawPreferences {
  endpoint: string;
  bucket: string;
  region?: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
  keyPrefix?: string;
  forcePathStyle?: boolean;
  maxUploadBytes?: string;
  maxRetries?: string;
}

export interface ExtensionConfig {
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
  keyPrefix?: string;
  forcePathStyle: boolean;
  maxUploadBytes: number;
  maxRetries: number;
}

export class ConfigValidationError extends Error {
  constructor(
    public readonly fields: string[],
    message?: string,
  ) {
    super(message ?? `Invalid extension preferences: ${fields.join(", ")}`);
    this.name = "ConfigValidationError";
  }
}

export function parsePreferences(raw: RawPreferences): ExtensionConfig {
  const endpoint = raw.endpoint?.trim() ?? "";
  const bucket = raw.bucket?.trim() ?? "";
  const region = raw.region?.trim() || DEFAULT_REGION;
  const accessKeyId = raw.accessKeyId?.trim() ?? "";
  const secretAccessKey = raw.secretAccessKey?.trim() ?? "";
  const publicBaseUrl = raw.publicBaseUrl?.trim() ?? "";
  const keyPrefix = normalizeOptionalPrefix(raw.keyPrefix);
  const forcePathStyle = raw.forcePathStyle ?? true;

  const invalidFields: string[] = [];

  if (!isValidHttpUrl(endpoint)) invalidFields.push("endpoint");
  if (!bucket) invalidFields.push("bucket");
  if (!region) invalidFields.push("region");
  if (!accessKeyId) invalidFields.push("accessKeyId");
  if (!secretAccessKey) invalidFields.push("secretAccessKey");
  if (!isValidHttpUrl(publicBaseUrl)) invalidFields.push("publicBaseUrl");

  const maxUploadBytes = parsePositiveInt(raw.maxUploadBytes, DEFAULT_MAX_UPLOAD_BYTES);
  if (!Number.isFinite(maxUploadBytes) || maxUploadBytes <= 0) invalidFields.push("maxUploadBytes");

  const maxRetries = parsePositiveInt(raw.maxRetries, DEFAULT_MAX_RETRIES);
  if (!Number.isFinite(maxRetries) || maxRetries < 0) invalidFields.push("maxRetries");

  if (invalidFields.length > 0) {
    throw new ConfigValidationError(invalidFields);
  }

  return {
    endpoint: endpoint.replace(/\/+$/g, ""),
    bucket,
    region,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: publicBaseUrl.replace(/\/+$/g, ""),
    keyPrefix,
    forcePathStyle,
    maxUploadBytes,
    maxRetries,
  };
}

export function formatPreferenceFieldList(fields: string[]): string {
  return fields.map((field) => FIELD_LABELS[field] ?? field).join(", ");
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return Number.NaN;
  return parsed;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeOptionalPrefix(prefix: string | undefined): string | undefined {
  if (!prefix) return undefined;
  const cleaned = prefix
    .trim()
    .replace(/^\/*/g, "")
    .replace(/\/*$/g, "")
    .replace(/\/{2,}/g, "/");
  return cleaned || undefined;
}
