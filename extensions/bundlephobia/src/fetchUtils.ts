import { showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { NpmsFetchResponse } from "./packagesResponse";
import { PackageResultModel } from "./packageRepsonse";

export const fetchSizeBundlephobia = async (packageName: string, signal: AbortSignal): Promise<PackageResultModel> => {
  const response = await fetch(`https://bundlephobia.com/api/size?package=${packageName}`, {
    method: "get",
    signal,
  });

  const json = (await response.json()) as PackageResultModel | { code: string; message: string };

  if (!response.ok || (json && "message" in json)) {
    throw new Error(json && "message" in json ? json.message : response.statusText);
  }

  return json as PackageResultModel;
};

export const fetchSuggestionsBundlephobia = async (
  packageName: string,
  signal: AbortSignal
): Promise<NpmsFetchResponse> => {
  const response = await fetch(`https://api.npms.io/v2/search/suggestions?q=${packageName}`, {
    method: "get",
    signal,
  });

  const json = (await response.json()) as NpmsFetchResponse | { code: string; message: string };

  if (!response.ok || (json && "message" in json)) {
    throw new Error(json && "message" in json ? json.message : response.statusText);
  }

  return json as NpmsFetchResponse;
};
