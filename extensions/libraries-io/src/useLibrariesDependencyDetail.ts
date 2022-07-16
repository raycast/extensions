import { showToast, ToastStyle } from "@raycast/api";
import fetch from "node-fetch";
import type { DependenciesResponse } from "./types";

export const useLibrariesDependencyDetail = async (platform = "", name = ""): Promise<DependenciesResponse> => {
  try {
    const response = await fetch(`https://libraries.io/api/${platform}/${name}/latest/dependencies`);
    const jsonResponse = await response.json();
    return jsonResponse as DependenciesResponse;
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Loading dependency info failed!");
    return Promise.resolve({} as DependenciesResponse);
  }
};
