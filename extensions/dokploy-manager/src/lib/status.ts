import { Color, Icon, Image } from "@raycast/api";
import { DeploymentStatus, ServiceStatus } from "../types/dokploy";

interface StatusPresentation {
  label: string;
  icon: Icon;
  color: Color;
}

const STATUS_PRESENTATION: Record<ServiceStatus, StatusPresentation> = {
  done: { label: "Done", icon: Icon.CheckCircle, color: Color.Green },
  running: { label: "Running", icon: Icon.CircleProgress, color: Color.Blue },
  error: { label: "Error", icon: Icon.XMarkCircle, color: Color.Red },
  idle: { label: "Idle", icon: Icon.Circle, color: Color.SecondaryText },
};

const UNKNOWN_STATUS: StatusPresentation = {
  label: "Unknown",
  icon: Icon.QuestionMarkCircle,
  color: Color.SecondaryText,
};

export function statusPresentation(status?: ServiceStatus): StatusPresentation {
  if (!status) return UNKNOWN_STATUS;
  return STATUS_PRESENTATION[status] ?? UNKNOWN_STATUS;
}

/** A tinted icon for list items - the fastest way to read a whole project's health at a glance. */
export function statusIcon(status?: ServiceStatus): Image.ImageLike {
  const { icon, color } = statusPresentation(status);
  return { source: icon, tintColor: color };
}

export function statusTag(status?: ServiceStatus): { value: string; color: Color } {
  const { label, color } = statusPresentation(status);
  return { value: label, color };
}

/** Deployments carry their own enum - `cancelled` has no equivalent on a service. */
const DEPLOYMENT_PRESENTATION: Record<DeploymentStatus, StatusPresentation> = {
  running: { label: "Running", icon: Icon.CircleProgress, color: Color.Blue },
  done: { label: "Done", icon: Icon.CheckCircle, color: Color.Green },
  error: { label: "Failed", icon: Icon.XMarkCircle, color: Color.Red },
  // The key is Dokploy's own enum value (British spelling); the label is ours, and the Raycast
  // store requires US English.
  cancelled: { label: "Canceled", icon: Icon.MinusCircle, color: Color.SecondaryText },
};

export function deploymentPresentation(status?: DeploymentStatus): StatusPresentation {
  if (!status) return UNKNOWN_STATUS;
  return DEPLOYMENT_PRESENTATION[status] ?? UNKNOWN_STATUS;
}

export function deploymentIcon(status?: DeploymentStatus): Image.ImageLike {
  const { icon, color } = deploymentPresentation(status);
  return { source: icon, tintColor: color };
}

export function deploymentTag(status?: DeploymentStatus): { value: string; color: Color } {
  const { label, color } = deploymentPresentation(status);
  return { value: label, color };
}
