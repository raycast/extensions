import { Action, type Tool } from "@raycast/api";
import { acknowledgeIncident } from "../api";
import { incidentDashboardUrl } from "../format";

type Input = {
  /** The Project ID (`prj_...`) that owns the Incident. */
  projectId: string;
  /** The open Incident ID (`inc_...`) to acknowledge. */
  incidentId: string;
  /** Optional human-readable Monitor name shown in the confirmation prompt. */
  monitorName?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    style: Action.Style.Regular,
    message: `Acknowledge Incident${input.monitorName ? ` on "${input.monitorName}"` : ""}? Repeat alerts will stop while recovery notifications remain active.`,
    info: [
      ...(input.monitorName ? [{ name: "Monitor", value: input.monitorName }] : []),
      { name: "Incident ID", value: input.incidentId },
      { name: "Project ID", value: input.projectId },
    ],
  };
};

/**
 * Acknowledge an open Incident in You Up? so repeat alerts stop while recovery alerts still fire. Requires a Full API token.
 */
export default async function tool(input: Input) {
  const updated = await acknowledgeIncident(input.projectId, input.incidentId);
  return {
    incidentId: updated.id,
    acknowledgedAt: updated.acknowledgedAt,
    acknowledgedBy: updated.acknowledgedBy,
    dashboardUrl: incidentDashboardUrl(input.projectId, updated.monitorId, updated.id),
  };
}
