import { Tool } from "@raycast/api";
import { startCaffeinate } from "../utils";

type Input = {
  /**
   * Future date and time to keep the Mac awake until, in ISO 8601 format.
   * Include the local UTC offset when known, for example "2026-07-19T17:00:00+01:00".
   */
  dateTime: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Keep your Mac awake until ${formatDateTime(parseFutureDate(input.dateTime))}?`,
});

/**
 * Prevents the Mac from sleeping until a specific future date and time.
 */
export default async function tool(input: Input) {
  const target = parseFutureDate(input.dateTime);
  const durationSeconds = Math.ceil((target.getTime() - Date.now()) / 1000);

  await startCaffeinate({ menubar: true, status: true }, undefined, `-t ${durationSeconds}`);

  return {
    caffeinated: true,
    until: target.toISOString(),
    durationSeconds,
    message: `Mac will stay awake until ${formatDateTime(target)}`,
  };
}

function parseFutureDate(dateTime: string): Date {
  const target = new Date(dateTime);

  if (!dateTime?.trim() || Number.isNaN(target.getTime())) {
    throw new Error("dateTime must be a valid ISO 8601 date and time");
  }

  if (target.getTime() <= Date.now()) {
    throw new Error("dateTime must be in the future");
  }

  return target;
}

function formatDateTime(date: Date): string {
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
