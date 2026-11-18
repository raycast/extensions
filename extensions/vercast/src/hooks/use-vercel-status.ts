import { useFetch } from "@raycast/utils";
import {
  INCIDENT_HISTORY_URL,
  STATUS_SUMMARY_URL,
  parseIncidentHistory,
  parseStatusSummary,
} from "../status/status-page";

/**
 * Vercel's current status from the public status page (no token needed).
 * `silent` leaves failures to `error` instead of a toast, for menu bar refreshes in the background.
 */
export function useStatusSummary({ silent = false }: { silent?: boolean } = {}) {
  return useFetch(STATUS_SUMMARY_URL, {
    parseResponse: parseStatusSummary,
    keepPreviousData: true,
    onError: silent ? (error) => console.error(error) : undefined,
    failureToastOptions: { title: "Failed to fetch Vercel status" },
  });
}

/** The 50 most recent incidents, resolved ones included. */
export function useIncidentHistory() {
  return useFetch(INCIDENT_HISTORY_URL, {
    parseResponse: parseIncidentHistory,
    keepPreviousData: true,
    failureToastOptions: { title: "Failed to fetch past Vercel incidents" },
  });
}
