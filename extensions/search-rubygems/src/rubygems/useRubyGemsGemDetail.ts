import { showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import type { GemDetailResponse } from "./types";

export const useRubyGemsGemDetail = async (name = ""): Promise<GemDetailResponse> => {
  try {
    const response = await fetch(`https://rubygems.org/api/v1/gems/${name}.json`);
    const jsonResponse = await response.json();
    return jsonResponse as GemDetailResponse;
  } catch (error) {
    console.error(error);
    showToast({
      style: Toast.Style.Failure,
      title: "Loading gem info failed!",
    });
    return Promise.resolve({} as GemDetailResponse);
  }
};
