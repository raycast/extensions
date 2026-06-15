import { getPreferenceValues, Cache, showToast, Toast } from "@raycast/api";
import { useFetch, usePromise } from "@raycast/utils";
import parse from "url-parse";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import mime from "mime";
import axios, { AxiosRequestConfig } from "axios";

import { Preferences, ResponseData, ROW_STATUS, AttachmentObj } from "./types";
import { MeResponse, PostFileResponse, PostMemoParams, MemoInfoResponse } from "./types";

const cache = new Cache();
const CURRENT_USER_PATH = "/api/v1/auth/me";
const LEGACY_CURRENT_USER_PATH = "/api/v1/auth/sessions/current";

const buildMemoListUrl = ({
  creatorName,
  state,
  pageSize,
}: {
  creatorName?: string;
  state?: ROW_STATUS;
  pageSize: number;
}) => {
  const params = new URLSearchParams({
    pageSize: String(pageSize),
  });

  if (state) {
    params.set("state", state);
  }

  if (creatorName) {
    params.set("parent", creatorName);
  }

  return getRequestUrl(`/api/v1/memos?${params.toString()}`);
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  const cookie = response.headers.get("Set-Cookie");

  if (cookie) {
    cache.set("cookie", cookie);
  }
  const data = await response.json();
  return data as T;
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

const getCurrentUserRequest = async () => {
  try {
    return await getFetch<MeResponse>({
      url: getRequestUrl(CURRENT_USER_PATH),
      method: "GET",
    });
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 404) {
      throw error;
    }

    return getFetch<MeResponse>({
      url: getRequestUrl(LEGACY_CURRENT_USER_PATH),
      method: "GET",
    });
  }
};

export const getMe = () => {
  return usePromise(getCurrentUserRequest, []);
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
  const { user: me } = await getCurrentUserRequest();

  const memos = await getFetch<{
    memos: MemoInfoResponse[];
  }>({
    url: buildMemoListUrl({
      creatorName: me.name,
      pageSize: 50,
    }),
    method: "GET",
  });

  const recentTags: string[] = [];

  memos.memos.forEach((memo) => {
    const tags = memo.tags || [];

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
    contentType: mime.getType(filePath) || "application/octet-stream",
  });

  return getFetch<PostFileResponse>({
    url: getRequestUrl(`/api/v1/attachments`),
    method: "POST",
    data: {
      content: readFile.toString("base64"),
      filename,
      type: mime.getType(filePath) || "application/octet-stream",
    },
  });
};

export const postMemoAttachments = (memoName: string, attachments: Partial<AttachmentObj>[]) => {
  const url = getRequestUrl(`/api/v1/${memoName}/attachments`);

  return getFetch<object>({
    url,
    method: "PATCH",
    data: {
      attachments,
    },
  });
};

export const getAllMemos = (currentUserName?: string, { state = ROW_STATUS.NORMAL } = {}) => {
  const url = buildMemoListUrl({
    creatorName: currentUserName,
    state,
    pageSize: 20,
  });

  const { isLoading, data, revalidate, pagination } = useFetch<
    {
      memos: MemoInfoResponse[];
      nextPageToken: string;
    },
    MemoInfoResponse[],
    MemoInfoResponse[]
  >(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    execute: Boolean(currentUserName),
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
  });

  return { isLoading, data: currentUserName ? data : [], revalidate, pagination };
};

export const patchMemo = (memoName: string, { state = ROW_STATUS.NORMAL } = {}) => {
  const url = getRequestUrl(`/api/v1/${memoName}`);

  return getFetch<ResponseData<MemoInfoResponse>>({
    url,
    method: "PATCH",
    data: {
      state,
    },
  });
};

export const archiveMemo = (memoName: string) => {
  return patchMemo(memoName, {
    state: ROW_STATUS.ARCHIVED,
  });
};

export const restoreMemo = (memoName: string) => {
  return patchMemo(memoName, {
    state: ROW_STATUS.NORMAL,
  });
};

export const deleteMemo = (memoName: string) => {
  const url = getRequestUrl(`/api/v1/${memoName}?openId=${getOpenId()}`);

  return getFetch<ResponseData<MemoInfoResponse>>({
    url,
    method: "DELETE",
  });
};

export const getAttachmentBinToBase64 = async (attachmentName: string, attachmentFilename: string) => {
  const url = getRequestUrl(`/file/${attachmentName}/${attachmentFilename}?thumbnail=1`);

  const blob = await getFetch<ArrayBuffer>({
    url,
    method: "GET",
    responseType: "arraybuffer",
  });

  const base64 = Buffer.from(blob).toString("base64");

  const mimeType = mime.getType(attachmentFilename) || "image/jpeg";
  const fullBase64 = `data:${mimeType};base64,${base64}`;

  return fullBase64;
};

export const getMemoByName = (memoName: string) => {
  const url = getRequestUrl(`/api/v1/${memoName}`);

  return getFetch<MemoInfoResponse>({
    url,
    method: "GET",
  });
};
