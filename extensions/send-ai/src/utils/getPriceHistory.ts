import { LocalStorage } from "@raycast/api";
import { ApiResponse } from "./api-wrapper";
import { STORAGE_KEYS } from "./constants";
import axios from "axios";
import { URL_ENDPOINTS } from "../constants/endpoints";
import { PriceHistory } from "../type";

export async function getPriceHistory({
  address,
  timeFrom,
  timeTo,
  timeInterval,
}: {
  address: string;
  timeFrom: number;
  timeTo: number;
  timeInterval: string;
  size?: "small" | "large";
}): Promise<ApiResponse<PriceHistory>> {
  try {
    const token = await LocalStorage.getItem<string>(STORAGE_KEYS.BACKEND_SESSION_TOKEN);
    const response = await axios.post<ApiResponse<PriceHistory>>(
      `${URL_ENDPOINTS.SEND_AI_API_URL}/get-price-history`,
      {
        address,
        timeFrom,
        timeTo,
        timeInterval,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    // If the response indicates an error, throw it so it can be caught by components
    if (response.data.status === "error") {
      throw new Error(response.data.message || "API request failed");
    }

    return response.data;
  } catch (error) {
    // Handle axios errors which contain backend response
    if (axios.isAxiosError(error) && error.response?.data) {
      const backendError = error.response.data;
      console.error(backendError);
      // If backend sent an error response, use its message
      if (backendError.status === "error" && backendError.message) {
        throw new Error(backendError.message);
      }
      // If backend sent a different error format, try to extract message
      if (backendError.message) {
        throw new Error(backendError.message);
      }
    }

    // create a new Error with a generic message
    throw new Error("Unknown error occurred");
  }
}
