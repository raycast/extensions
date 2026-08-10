import { ErrorResponse, Monitor, NewMonitor, SuccessResponse } from "../types";
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
  if (!res.headers.get("Content-Type")?.includes("json")) throw new Error(await res.text());
  const result = (await res.json()) as SuccessResponse<{ monitor: { id: number } }> | ErrorResponse;
  if (result.stat === "fail")
    throw new Error(result.error.message, {
      cause: result.error.type,
    });
  return result.monitor;
}

export async function createMonitor(newMonitor: NewMonitor) {
  const res = await fetch(API_URL + "newMonitor", {
    headers: API_HEADERS,
    method: "POST",
    body: new URLSearchParams({
      ...API_BODY,
      ...newMonitor,
    }).toString(),
  });
  if (!res.headers.get("Content-Type")?.includes("json")) throw new Error(await res.text());
  const result = (await res.json()) as SuccessResponse<Monitor> | ErrorResponse;
  if (result.stat === "fail")
    throw new Error(result.error.message, {
      cause: result.error.type,
    });
  return result;
}
