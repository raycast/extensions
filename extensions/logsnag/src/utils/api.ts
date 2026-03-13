import { Toast, showToast } from "@raycast/api";
import { ErrorResponse, Insight, Log } from "./types";
import fetch from "node-fetch";
import { API_HEADERS, API_URL } from "./constants";

const callApi = async (endpoint: string, body: Log | Insight, animatedToastMessage = "") => {
  await showToast(Toast.Style.Animated, "Processing...", animatedToastMessage);

  try {
    const apiResponse = await fetch(API_URL + endpoint, {
      method: "POST",
      headers: API_HEADERS,
      body: JSON.stringify(body),
    });

    if (!apiResponse.ok) {
      const { status } = apiResponse;
      const error = `${status} Error`;

      const response = (await apiResponse.json()) as ErrorResponse;

      await showToast(Toast.Style.Failure, error, response.message);
      return response;
    }

    const response = await apiResponse.json();
    await showToast(Toast.Style.Success, `Success`);
    return response;
  } catch (err) {
    const error = "Failed to execute request. Please try again later.";
    await showToast(Toast.Style.Failure, `Error`, error);
    return { error };
  }
};

// LOG
export async function publishLog(options: Log) {
  return (await callApi(`log`, { ...options }, "Logging Event")) as ErrorResponse | Log;
}

// INSIGHT
export async function publishInsight(options: Insight) {
  return (await callApi(`insight`, { ...options }, "Publishing Insight")) as ErrorResponse | Insight;
}
