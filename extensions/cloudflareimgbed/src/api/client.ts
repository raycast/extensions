import { getPreferenceValues } from "@raycast/api";
import type { ImgBedPreferences } from "../types/preferences";
import type { ImgBedFileItem } from "../types/files";
import type { ImgBedListResponse } from "../types/files";
import type { ImgBedClient as ImgBedClientInterface, ListQuery, UploadOptions, TagUpdatePayload } from "./interfaces";
import { mapListResponse } from "../utils/files";
import { retry } from "../utils/retry";
import { getMimeType } from "../utils/mime";

type RequestOptions = {
  method?: string;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  body?: BodyInit | undefined;
};

export class ImgBedClient implements ImgBedClientInterface {
  private readonly prefs: ImgBedPreferences;

  constructor(prefs: ImgBedPreferences = getPreferenceValues<ImgBedPreferences>()) {
    this.prefs = {
      ...prefs,
      apiBaseUrl: prefs.apiBaseUrl.replace(/\/+$/, ""),
    };
  }

  async uploadImage(options: UploadOptions): Promise<string> {
    const formData = new FormData();
    formData.append("file", await fileFromPath(options.filePath, options.fileName));

    const query = new URLSearchParams();
    query.set("uploadChannel", options.channel ?? this.prefs.uploadChannel ?? "telegram");
    if (options.folder ?? this.prefs.uploadFolder) {
      query.set("uploadFolder", (options.folder ?? this.prefs.uploadFolder) as string);
    }
    if (options.nameType ?? this.prefs.uploadNameType) {
      query.set("uploadNameType", (options.nameType ?? this.prefs.uploadNameType) as string);
    }
    if (options.returnFormat ?? this.prefs.returnFormat) {
      query.set("returnFormat", (options.returnFormat ?? this.prefs.returnFormat) as string);
    }
    query.set("serverCompress", String(options.serverCompress ?? this.prefs.serverCompress ?? true));
    query.set("autoRetry", String(options.autoRetry ?? this.prefs.autoRetry ?? true));

    const response = await this.request(`/upload?${query.toString()}`, {
      method: "POST",
      body: formData,
    });

    const data = (await response.json()) as Array<{ src: string }>;
    const first = data[0];
    return first?.src ? this.composeUrl(first.src) : "";
  }

  async listFiles(query: ListQuery): Promise<ImgBedFileItem[]> {
    const url = "/api/manage/list";
    const params = new URLSearchParams();
    if (query.dir ?? this.prefs.defaultDir) {
      params.set("dir", query.dir ?? this.prefs.defaultDir ?? "");
    }
    if (query.search) params.set("search", query.search);
    if (query.includeTags) params.set("includeTags", query.includeTags);
    if (query.excludeTags) params.set("excludeTags", query.excludeTags);
    if (query.channel ?? this.prefs.defaultChannel) {
      params.set("channel", query.channel ?? this.prefs.defaultChannel ?? "");
    }
    if (query.listType) params.set("listType", query.listType);
    params.set("start", String(query.start ?? 0));
    params.set("count", String(query.count ?? this.prefs.pageSize ?? 50));
    if (query.recursive) params.set("recursive", "true");

    const response = await this.request(`${url}?${params.toString()}`);
    const data = (await response.json()) as ImgBedListResponse;
    return mapListResponse(this.prefs.apiBaseUrl, data);
  }

  async deleteFile(path: string, opts?: { folder?: boolean }): Promise<void> {
    const encodedPath = encodeURIComponent(path);
    const query = opts?.folder ? "?folder=true" : "";
    const method = "DELETE";
    await this.request(`/api/manage/delete/${encodedPath}${query}`, { method });
  }

  async getTags(fileId: string): Promise<string[]> {
    const encodedPath = encodeURIComponent(fileId);
    const response = await this.request(`/api/manage/tags/${encodedPath}`, {
      headers: { "Cache-Control": "no-cache" },
    });
    const data = (await response.json()) as { tags?: string[] };
    return data.tags ?? [];
  }

  async updateTags(fileId: string, payload: TagUpdatePayload): Promise<string[]> {
    const encodedPath = encodeURIComponent(fileId);
    const response = await this.request(`/api/manage/tags/${encodedPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { tags?: string[] };
    return data.tags ?? [];
  }

  private composeUrl(path: string) {
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    const normalizedPath =
      path.startsWith("file/") || path.startsWith("/file/")
        ? path.replace(/^\/+/, "")
        : `file/${path.replace(/^\/+/, "")}`;
    return `${this.prefs.apiBaseUrl}/${normalizedPath}`;
  }

  private async request(path: string, options: RequestOptions = {}) {
    const url = `${this.prefs.apiBaseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.prefs.apiToken}`,
      ...(options.headers ?? {}),
    };

    return retry(() =>
      fetch(url, {
        method: options.method ?? "GET",
        headers,
        body: options.body,
      }).then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status} ${response.statusText}`);
        }
        return response;
      }),
    );
  }
}

async function fileFromPath(path: string, overrideName?: string) {
  const { readFile } = await import("node:fs/promises");
  const buffer = await readFile(path);
  const fileName = overrideName ?? path.split("/").pop() ?? "file";
  const type = getMimeType(fileName);
  return new File([new Uint8Array(buffer)], fileName, { type });
}
