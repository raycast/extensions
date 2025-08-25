import { OPENSTATUS_STATUS_API_URL } from "../lib/constants";

enum OpenStatusStatus {
  Operational = "operational",
  DegradedPerformance = "degraded_performance",
  PartialOutage = "partial_outage",
  MajorOutage = "major_outage",
  UnderMaintenance = "under_maintenance", // currently not in use
  Unknown = "unknown",
  Incident = "incident",
}

interface OpenStatusResponse {
  status: OpenStatusStatus;
}

/**
 * Gets the status of the Sparkscan API.
 * Should be retried if status is unknown.
 */
export default async function tool() {
  const response = await fetch(OPENSTATUS_STATUS_API_URL);
  if (!response.ok) {
    console.error("Failed to fetch status:", response.statusText);
    throw new Error(response.statusText);
  }

  const data = (await response.json()) as OpenStatusResponse;

  return {
    status: data?.status || OpenStatusStatus.Unknown,
  };
}
