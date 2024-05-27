import { getPreferenceValues, Cache, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import parse from "url-parse";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import mime from "mime";
import axios, { AxiosRequestConfig } from "axios";

import { Preferences, ResponseData, ROW_STATUS } from "./types";
import { MeResponse, PostFileResponse, PostMemoParams, MemoInfoResponse, TagResponse } from "./types";

const cache = new Cache();

const parseResponse = async (response: Response) => {
  const cookie = response.headers.get("Set-Cookie");

  if (cookie) {
    cache.set("cookie", cookie);
  }
  const data = await response.json();
  return data;
};

const getOpenApi = () => {
  const preferences = getPreferenceValues<Preferences>();

  const { openApi } = preferences;

  return openApi;
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

export const getOriginUrl = () => {
  const api = getOpenApi() || getHost();

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
  const openApi = getOpenApi();
  const token = getToken();

  if (openApi) {
    const { query } = parse(openApi);
    const parseQuery = parse.qs.parse(query);

    return parseQuery.openId;
  } else if (token) {
    return token;
  } else {
    showToast({
      style: Toast.Style.Failure,
      title: "Please set the host or openApi in the preferences",
    });
    return "";
  }
};

const getUseFetch = <T>(url: string, options: Record<string, any>) => {
  return useFetch<T, T>(url, {
    headers: {
      "Content-Type": "application/json",
      cookie: cache.get("cookie") || "",
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
      cookie: cache.get("cookie") || "",
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

export const getTags = () => {
  const url = getRequestUrl(`/api/v1/tag?openId=${getOpenId()}`);

  return getUseFetch<ResponseData<TagResponse> & TagResponse>(url, {
    keepPreviousData: true,
    initialData: {
      data: [],
    },
  });
};

export const postFile = (filePath: string) => {
  const readFile = fs.readFileSync(filePath);

  const formData = new FormData();
  formData.append("file", readFile, {
    filename: path.basename(filePath),
    contentType: mime.getType(filePath) || undefined,
  });

  return getFetch<ResponseData<PostFileResponse> & PostFileResponse>({
    url: getRequestUrl(`/api/v1/resource/blob?openId=${getOpenId()}`),
    method: "POST",
    data: formData,
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
};

export const getAllMemos = (currentUserId?: number) => {
  let filter = encodeURIComponent(`creator=='users/${currentUserId}'`);

  if (!currentUserId) {
    filter = "";
  }

  const url = getRequestUrl(`/api/v1/memos?filter=${filter}`);

  const { isLoading, data, revalidate } = getUseFetch<{
    memos: MemoInfoResponse[];
  }>(url, {
    keepPreviousData: true,
    initialData: {
      memos: [],
    },
  });

  return { isLoading, data: currentUserId ? data : { memos: [] }, revalidate };
};

export const patchMemo = (memoId: string, { rowStatus = ROW_STATUS.NORMAL } = {}) => {
  const url = getRequestUrl(`/api/v1/memo/${memoId}?openId=${getOpenId()}`);

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
