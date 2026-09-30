import { showToast, ToastStyle } from "@raycast/api";
import fetch from "node-fetch";
import type { HexSearchResponse } from "./types";

export const useHexSearch = async (searchTerm = ""): Promise<HexSearchResponse> => {
  const preparedSearchTerm = searchTerm.replace(/\s+/g, "+");

  if (!preparedSearchTerm) return Promise.resolve([]);

  try {
    const response = await fetch(`https://hex.pm/api/packages?sort=recent_downloads&search=${preparedSearchTerm}`);
    const jsonResponse = await response.json();
    return jsonResponse as HexSearchResponse;
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Searching Hex failed!");
    return Promise.resolve([]);
  }
};
