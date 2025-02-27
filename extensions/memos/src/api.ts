import { getPreferenceValues, Cache, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import parse from "url-parse";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import mime from "mime";
import axios, { AxiosRequestConfig } from "axios";

import { Preferences, ResponseData, ROW_STATUS, ResourceObj } from "./types";
import { MeResponse, PostFileResponse, PostMemoParams, MemoInfoResponse } from "./types";

const cache = new Cache();

const parseResponse = async (response: Response) => {
  const cookie = response.headers.get("Set-Cookie");

  if (cookie) {
    cache.set("cookie", cookie);
  }
  const data = await response.json();
  return data;
};

const getHost = () => {
  const preferences = getPreferenceValues<Preferences>();

  const { host } = preferences;

  return host;
};

export const getToken = () => {
  const preferences = getPreferenceValues<Preferences>();

  const { token } = preferences;

  return token;
};

export const getCookie = () => {
  return `memos.access-token=${getToken()}`;
};

export const getOriginUrl = () => {
  const api = getHost();

  if (!api) {
    showToast({
      style: Toast.Style.Failure,
      title: "Please set the host or openApi in the preferences",
    });
    return "";
  }

  const { origin } = parse(api);
  return origin;
};

export const getRequestUrl = (path = "") => {
  const origin = getOriginUrl();
  const url = `${origin}${path}`;
  return url;
};

const getOpenId = () => {
  const token = getToken();

  if (token) {
    return token;
  } else {
    showToast({
      style: Toast.Style.Failure,
      title: "Please set the host or openApi in the preferences",
    });
    return "";
  }
};

const getUseFetch = <T>(url: string, options: Record<string, unknown>) => {
  return useFetch<T, T>(url, {
    headers: {
      "Content-Type": "application/json",
      // Cookie: getCookie(),
      Authorization: `Bearer ${getToken()}`,
    },
    parseResponse,
    ...options,
  });
};

const getFetch = <T>(options: AxiosRequestConfig) => {
  return axios<T>({
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      cookie: getCookie(),
      Authorization: `Bearer ${getToken()}`,
    },
    ...options,
  }).then((res) => {
    if (res?.headers?.["set-cookie"]?.length) {
      const cookie = res.headers["set-cookie"].reduce((acc, cur) => {
        return acc + cur;
      }, "");
      cache.set("cookie", cookie);
    }

    return res.data;
  });
};

export const getMe = () => {
  return getUseFetch<MeResponse>(getRequestUrl(`/api/v1/auth/status`), {
    method: "POST",
  });
};

export const sendMemo = (data: PostMemoParams) => {
  const url = getRequestUrl(`/api/v1/memos`);

  return getFetch<MemoInfoResponse>({
    url,
    method: "POST",
    data,
  });
};

export const getRecentTags = async (): Promise<string[]> => {
  const me = await getFetch<MeResponse>({
    url: getRequestUrl(`/api/v1/auth/status`),
    method: "POST",
  });

  const memos = await getFetch<{
    memos: MemoInfoResponse[];
  }>({
    url: getRequestUrl(`/api/v1/memos?pageSize=50&filter=creator=='users/${me.id}'`),
    method: "GET",
  });

  const recentTags: string[] = [];

  memos.memos.forEach((memo) => {
    const tags = memo.property?.tags || [];

    tags.forEach((tag) => {
      if (!recentTags.includes(tag)) {
        recentTags.push(tag);
      }
    });
  });

  return recentTags;
};

export const postFile = (filePath: string, filename: string) => {
  const readFile = fs.readFileSync(filePath);

  const formData = new FormData();
  formData.append("file", readFile, {
    filename: path.basename(filePath),
    contentType: mime.getType(filePath) || undefined,
  });

  return getFetch<PostFileResponse>({
    url: getRequestUrl(`/api/v1/resources`),
    method: "POST",
    data: {
      content: readFile.toString("base64"),
      filename,
      type: mime.getType(filePath) || undefined,
    },
  });
};

export const postMemoResources = (memoName: string, resources: Partial<ResourceObj>[]) => {
  const url = getRequestUrl(`/api/v1/${memoName}/resources`);

  return getFetch<object>({
    url,
    method: "PATCH",
    data: {
      resources,
    },
  });
};

export const getAllMemos = (currentUserId?: number) => {
  let filter = encodeURIComponent(`creator=='users/${currentUserId}'`);

  if (!currentUserId) {
    filter = "";
  }

  const url = getRequestUrl(`/api/v1/memos?filter=${filter}&pageSize=20`);

  const { isLoading, data, revalidate, pagination } = useFetch<
    {
      memos: MemoInfoResponse[];
      nextPageToken: string;
    },
    MemoInfoResponse[],
    MemoInfoResponse[]
  >(
    (options) => {
      return `${url}&pageToken=${options?.cursor || ""}`;
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      parseResponse,
      mapResult(result) {
        return {
          data: result?.memos || [],
          cursor: result?.nextPageToken || "",
          hasMore: !!result.nextPageToken || false,
        };
      },
      keepPreviousData: true,
      initialData: [],
    },
  );

  return { isLoading, data: currentUserId ? data : [], revalidate, pagination };
};

export const patchMemo = (memoId: string, { rowStatus = ROW_STATUS.NORMAL } = {}) => {
  const url = getRequestUrl(`/api/v1/memo/${memoId}`);

  return getFetch<ResponseData<MemoInfoResponse>>({
    url,
    method: "PATCH",
    data: {
      id: memoId,
      rowStatus,
    },
  });
};

export const archiveMemo = (memoId: string) => {
  return patchMemo(memoId, {
    rowStatus: ROW_STATUS.ARCHIVED,
  });
};

export const restoreMemo = (memoId: string) => {
  return patchMemo(memoId, {
    rowStatus: ROW_STATUS.NORMAL,
  });
};

export const deleteMemo = (memoId: string) => {
  const url = getRequestUrl(`/api/v1/memo/${memoId}?openId=${getOpenId()}`);

  return getFetch<ResponseData<MemoInfoResponse>>({
    url,
    method: "DELETE",
  });
};

export const getResourceBin = (resourceName: string, resourceFilename: string) => {
  const url = getRequestUrl(`/file/${resourceName}/${resourceFilename}`);

  return getFetch<Blob>({
    url,
    method: "GET",
    responseType: "blob",
  });
};
