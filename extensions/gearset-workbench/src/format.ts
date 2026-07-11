import { Color, Icon } from "@raycast/api";
import { CiRunState, PipelineDeployment } from "./types";

export function stateColor(state?: string): Color {
  if (state === "Succeeded" || state === "Successful" || state === "Idle") return Color.Green;
  if (state === "Failed" || state === "Partial" || state === "PartiallySuccessful") return Color.Red;
  if (state === "Running" || state === "Started" || state === "Pending") return Color.Orange;
  return Color.SecondaryText;
}

export function stateIcon(state?: string): Icon {
  if (state === "Succeeded" || state === "Successful" || state === "Idle") return Icon.CheckCircle;
  if (state === "Failed") return Icon.XMarkCircle;
  if (state === "Running" || state === "Started" || state === "Pending") return Icon.Clock;
  return Icon.Circle;
}

export function isTerminalRunState(state: CiRunState): boolean {
  return state === "Succeeded" || state === "Partial" || state === "Failed";
}

export function deploymentTitle(deployment: PipelineDeployment): string {
  return (
    (typeof deployment.FriendlyName === "string" && deployment.FriendlyName) ||
    (typeof deployment.Name === "string" && deployment.Name) ||
    deployment.SalesforceFinalDeploymentId ||
    deployment.DeploymentId ||
    "Gearset deployment"
  );
}

export function safeJson(value: unknown, limit = 50_000): string {
  const json = JSON.stringify(value, null, 2);
  return json.length <= limit ? json : `${json.slice(0, limit)}\n… output truncated`;
}

export function flattenAuditPayload(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload))
    return payload.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
  if (!payload || typeof payload !== "object") return [];
  for (const value of Object.values(payload)) {
    if (Array.isArray(value)) {
      return value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
    }
  }
  return [payload as Record<string, unknown>];
}

export function auditItemTitle(item: Record<string, unknown>, index: number): string {
  for (const key of ["FriendlyName", "Name", "Action", "Event", "Description", "DeploymentId", "Id"]) {
    if (typeof item[key] === "string" && item[key]) return String(item[key]);
  }
  return `Audit entry ${index + 1}`;
}
