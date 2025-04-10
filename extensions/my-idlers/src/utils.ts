import { getPreferenceValues } from "@raycast/api";
import dayjs from "dayjs";
import { Server } from "./types";

const { max_num_as_unlimited } = getPreferenceValues<Preferences>();

function isMax(num: number) {
  const MAX = 999999;
  const MAX_SERVER_BW = 99999;
  return num === MAX || num === MAX_SERVER_BW;
}
export function numOrUnlimited(num: number, maxText = "Unlimited") {
  return isMax(num) && max_num_as_unlimited ? maxText : num.toString();
}

export function dayHasPassed(date: Date | null) {
  if (!date) return true;
  return dayjs(new Date()).diff(date, "h") >= 24;
}

export function capitalizeFirst(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export async function deleteServer(server: Server) {
  const { url, api_key } = getPreferenceValues<Preferences>();
  const api_url = new URL(`api/servers/${server.id}`, url).toString();
  const response = await fetch(api_url, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${api_key}`,
    },
  });
  if (!response.ok) throw new Error();
  const result = (await response.json()) as { result: "success" };
  return result;
}
