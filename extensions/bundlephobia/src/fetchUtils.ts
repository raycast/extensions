import { showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { NpmsFetchResponse } from "./packagesResponse";
import { PackageResultModel } from "./packageRepsonse";

export const fetchSizeBundlephobia = async (packageName: string): Promise<PackageResultModel> => {
  try {
    const response = await fetch(`https://bundlephobia.com/api/size?package=${packageName}`);
    const json = await response.json();

    return json as PackageResultModel;
  } catch (e: any) {
    showToast(Toast.Style.Failure, "Could not fetch information of package");

    return Promise.resolve(null);
  }
};

export const fetchSuggestionsBunldephobia = async (packageName: string): Promise<NpmsFetchResponse> => {
  try {
    const response = await fetch(`https://api.npms.io/v2/search/suggestions?q=${packageName}`);
    const json = await response.json();

    return json as NpmsFetchResponse;
  } catch (e: any) {
    showToast(Toast.Style.Failure, "Could not fetch matched packages");

    return Promise.resolve([]);
  }
};
