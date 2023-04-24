import { getPreferenceValues, Cache } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import parse from "url-parse";
import qs from "qs";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import mime from "mime";
import axios, { AxiosRequestConfig } from "axios";

import { Preferences, ResponseData, ROW_STATUS, ROW_STATUS_KEY } from "./types";
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

export const getOriginUrl = () => {
  const { origin } = parse(getOpenApi());
  return origin;
};

export const getRequestUrl = (path = "") => {
  const origin = getOriginUrl();
  const url = `${origin}${path}`;
  return url;
};

const getOpenId = () => {
  const { query } = parse(getOpenApi());
  const parseQuery = parse.qs.parse(query);

  return parseQuery.openId;
};

const getUseFetch = <T>(url: string, options: Record<string, any>) => {
  return useFetch<T, T>(url, {
    headers: {
      "Content-Type": "application/json",
      cookie: cache.get("cookie") || "",
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
  return getUseFetch<ResponseData<MeResponse>>(getRequestUrl(`/api/user/me?openId=${getOpenId()}`), {});
};

export const sendMemo = (data: PostMemoParams) => {
  return getFetch<ResponseData<MemoInfoResponse>>({
    url: getOpenApi(),
    method: "POST",
    data,
  });
};

export const getTags = () => {
  const url = getRequestUrl(`/api/tag?openId=${getOpenId()}`);

  return getUseFetch<ResponseData<TagResponse>>(url, {
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

  return getFetch<ResponseData<PostFileResponse>>({
    url: getRequestUrl(`/api/resource/blob?openId=${getOpenId()}`),
    method: "POST",
    data: formData,
    headers: {},
  });
};

export const getAllMemos = (rowStatus: ROW_STATUS_KEY = ROW_STATUS.NORMAL) => {
  const queryString = qs.stringify({
    openId: getOpenId(),
    rowStatus,
  });

  const url = getRequestUrl(`/api/memo?${queryString}`);

  const { isLoading, data, revalidate } = getUseFetch<ResponseData<MemoInfoResponse[]>>(url, {
    keepPreviousData: true,
    initialData: {
      data: [],
    },
  });

  return { isLoading, data, revalidate };
};

export const patchMemo = (memoId: number, { rowStatus = ROW_STATUS.NORMAL } = {}) => {
  const url = getRequestUrl(`/api/memo/${memoId}?openId=${getOpenId()}`);

  return getFetch<ResponseData<MemoInfoResponse>>({
    url,
    method: "PATCH",
    data: {
      id: memoId,
      rowStatus,
    },
  });
};

export const archiveMemo = (memoId: number) => {
  return patchMemo(memoId, {
    rowStatus: ROW_STATUS.ARCHIVED,
  });
};

export const restoreMemo = (memoId: number) => {
  return patchMemo(memoId, {
    rowStatus: ROW_STATUS.NORMAL,
  });
};

export const deleteMemo = (memoId: number) => {
  const url = getRequestUrl(`/api/memo/${memoId}?openId=${getOpenId()}`);

  return getFetch<ResponseData<MemoInfoResponse>>({
    url,
    method: "DELETE",
  });
};
