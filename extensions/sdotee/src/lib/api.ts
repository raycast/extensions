import { getPreferenceValues } from "@raycast/api";

function getConfig() {
  const { apiKey, baseUrl } = getPreferenceValues<Preferences>();
  return {
    apiKey,
    baseUrl: (baseUrl || "https://s.ee/api/v1").replace(/\/+$/, ""),
  };
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData = false,
): Promise<T> {
  const { apiKey, baseUrl } = getConfig();
  const url = `${baseUrl}${path}`;
  const headers: Record<string, string> = { Authorization: apiKey };
  if (!isFormData) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method,
    headers,
    body: isFormData
      ? (body as FormData)
      : body
        ? JSON.stringify(body)
        : undefined,
  });

  const json = (await res.json()) as { message?: string };
  if (!res.ok) {
    throw new Error(json.message || `API error: ${res.status}`);
  }
  return json as T;
}

// ── Short URL ──

export interface CreateShortUrlRequest {
  target_url: string;
  domain: string;
  custom_slug?: string;
  password?: string;
  expire_at?: number;
  expiration_redirect_url?: string;
  tag_ids?: number[];
  title?: string;
}

export interface ShortUrlResponse {
  code: number;
  data: { custom_slug: string; short_url: string; slug: string };
  message: string;
}

export function createShortUrl(req: CreateShortUrlRequest) {
  return request<ShortUrlResponse>("POST", "/shorten", req);
}

export function updateShortUrl(req: {
  domain: string;
  slug: string;
  target_url: string;
  title: string;
}) {
  return request<unknown>("PUT", "/shorten", req);
}

export function deleteShortUrl(req: { domain: string; slug: string }) {
  return request<unknown>("DELETE", "/shorten", req);
}

export interface DomainsResponse {
  code: number;
  data: { domains: string[] };
  message: string;
}

export function getUrlDomains() {
  return request<DomainsResponse>("GET", "/domains");
}

export interface Tag {
  id: number;
  name: string;
}

export interface TagsResponse {
  code: number;
  data: { code: number; data: { tags: Tag[] }; message: string };
  message: string;
}

export function getTags() {
  return request<TagsResponse>("GET", "/tags");
}

export interface VisitStatResponse {
  code: number;
  data: { visit_count: number };
  message: string;
}

export function getVisitStat(
  domain: string,
  slug: string,
  period?: "daily" | "monthly" | "totally",
) {
  const params = new URLSearchParams({ domain, slug });
  if (period) params.set("period", period);
  return request<VisitStatResponse>("GET", `/link/visit-stat?${params}`);
}

// ── Text Sharing ──

export interface CreateTextRequest {
  content: string;
  title: string;
  domain?: string;
  custom_slug?: string;
  expire_at?: number;
  password?: string;
  tag_ids?: number[];
  text_type?: "plain_text" | "source_code" | "markdown";
}

export interface TextResponse {
  code: number;
  data: { custom_slug: string; short_url: string; slug: string };
  message: string;
}

export function createText(req: CreateTextRequest) {
  return request<TextResponse>("POST", "/text", req);
}

export function updateText(req: {
  content: string;
  domain: string;
  slug: string;
  title: string;
}) {
  return request<unknown>("PUT", "/text", req);
}

export function deleteText(req: { domain: string; slug: string }) {
  return request<unknown>("DELETE", "/text", req);
}

export function getTextDomains() {
  return request<DomainsResponse>("GET", "/text/domains");
}

// ── File Sharing ──

export interface FileUploadResponse {
  code: number;
  data: {
    created_at: number;
    delete: string;
    file_id: number;
    filename: string;
    hash: string;
    height: number;
    page: string;
    path: string;
    size: number;
    storename: string;
    upload_status: number;
    url: string;
    width: number;
  };
  message: string;
}

export function uploadFile(formData: FormData) {
  return request<FileUploadResponse>("POST", "/file/upload", formData, true);
}

export function deleteFile(hash: string) {
  return request<{ code: string; message: string; success: boolean }>(
    "GET",
    `/file/delete/${hash}`,
  );
}

export function getFileDomains() {
  return request<DomainsResponse>("GET", "/file/domains");
}

export interface FileHistoryResponse {
  code: number;
  data: FileUploadResponse["data"][];
  message: string;
  success: boolean;
}

export function getFileHistory(page = 1) {
  return request<FileHistoryResponse>("GET", `/files?page=${page}`);
}

export function getPrivateFileDownloadUrl(fileId: number) {
  return request<{
    code: number;
    data: { file_id: number; url: string; expires_at: number };
    message: string;
  }>("GET", `/file/private/download-url?file_id=${fileId}`);
}

// ── General ──

export interface UsageResponse {
  code: number;
  data: Record<string, number | string>;
  message: string;
}

export function getUsage() {
  return request<UsageResponse>("GET", "/usage");
}
