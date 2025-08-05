import { showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import type { GemsSearchResponse } from "./types";

export const useRubyGemsSearch = async (searchTerm = ""): Promise<GemsSearchResponse> => {
  const preparedSearchTerm = searchTerm.replace(/\s+/g, "+");

  if (!preparedSearchTerm) return Promise.resolve([]);

  try {
    const response = await fetch(`https://rubygems.org/api/v1/search.json?query=${preparedSearchTerm}`);
    const jsonResponse = await response.json();
    return jsonResponse as GemsSearchResponse;
  } catch (error) {
    console.error(error);
    showToast({
      style: Toast.Style.Failure,
      title: "Searching rubygems.org failed!",
    });
    return Promise.resolve([]);
  }
};
