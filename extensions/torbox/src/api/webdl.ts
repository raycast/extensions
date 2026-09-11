import { BASE_URL, request, authHeaders } from "./client";
import { ListResponse, DataResponse, Hoster, CreateWebDownloadResult } from "./types";

export interface CreateWebDownloadOptions {
  link: string;
  password?: string;
  name?: string;
  asQueued?: boolean;
  onlyIfCached?: boolean;
}

export const createWebDownload = async (
  apiKey: string,
  options: CreateWebDownloadOptions,
): Promise<DataResponse<CreateWebDownloadResult>> => {
  const formData = new FormData();

  formData.append("link", options.link);

  if (options.password) {
    formData.append("password", options.password);
  }

  if (options.name) {
    formData.append("name", options.name);
  }

  if (options.asQueued) {
    formData.append("as_queued", "true");
  }

  if (options.onlyIfCached) {
    formData.append("add_only_if_cached", "true");
  }

  return request<DataResponse<CreateWebDownloadResult>>(`${BASE_URL}/webdl/createwebdownload`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: formData,
  });
};

export const fetchHosters = async (): Promise<Hoster[]> => {
  const response = await request<ListResponse<Hoster>>(`${BASE_URL}/webdl/hosters`);
  return response.data || [];
};
