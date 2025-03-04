import fetch from "node-fetch";
import { ErrorResponse, SuccessResponse } from "../types";
import { API_BODY, API_HEADERS, API_URL } from "../config";

export async function deleteMonitor(monitorId: number) {
  const res = await fetch(API_URL + "deleteMonitor", {
    headers: API_HEADERS,
    method: "POST",
    body: new URLSearchParams({
      ...API_BODY,
      id: monitorId.toString(),
    }).toString(),
  });
  const result = (await res.json()) as SuccessResponse<{ monitor: { id: number } }> | ErrorResponse;
  if (result.stat === "fail")
    throw new Error(result.error.message, {
      cause: result.error.type,
    });
  return result.monitor;
}
