import { Color, Icon } from "@raycast/api";
import { EnvironmentStatus } from "../types/environment";
import { DeploymentStatus } from "../types/deployment";
import { CommandStatus } from "../types/command";
import { DomainStatus } from "../types/domain";
import { LogLevel } from "../types/log";

export function getEnvironmentStatusIcon(status: EnvironmentStatus): { icon: Icon; color: Color } {
  switch (status) {
    case "running":
      return { icon: Icon.CircleFilled, color: Color.Green };
    case "deploying":
      return { icon: Icon.CircleFilled, color: Color.Blue };
    case "hibernating":
      return { icon: Icon.CircleFilled, color: Color.Yellow };
    case "stopped":
      return { icon: Icon.CircleFilled, color: Color.Red };
    default:
      return { icon: Icon.Circle, color: Color.SecondaryText };
  }
}

export function getDeploymentStatusIcon(status: DeploymentStatus): { icon: Icon; color: Color } {
  if (status === "deployment.succeeded" || status === "build.succeeded") {
    return { icon: Icon.CheckCircle, color: Color.Green };
  }
  if (status.includes("failed") || status === "failed") {
    return { icon: Icon.XMarkCircle, color: Color.Red };
  }
  if (status === "cancelled") {
    return { icon: Icon.MinusCircle, color: Color.SecondaryText };
  }
  if (status.includes("running")) {
    return { icon: Icon.CircleProgress, color: Color.Blue };
  }
  // pending, queued, created states
  return { icon: Icon.Clock, color: Color.Yellow };
}

export function getDeploymentStatusLabel(status: DeploymentStatus): string {
  const labels: Record<string, string> = {
    pending: "Pending",
    "build.pending": "Build Pending",
    "build.created": "Build Created",
    "build.queued": "Build Queued",
    "build.running": "Building",
    "build.succeeded": "Build Succeeded",
    "build.failed": "Build Failed",
    cancelled: "Cancelled",
    failed: "Failed",
    "deployment.pending": "Deploy Pending",
    "deployment.created": "Deploy Created",
    "deployment.queued": "Deploy Queued",
    "deployment.running": "Deploying",
    "deployment.succeeded": "Deployed",
    "deployment.failed": "Deploy Failed",
  };
  return labels[status] || status;
}

export function getCommandStatusIcon(status: CommandStatus): { icon: Icon; color: Color } {
  switch (status) {
    case "command.success":
      return { icon: Icon.CheckCircle, color: Color.Green };
    case "command.failure":
      return { icon: Icon.XMarkCircle, color: Color.Red };
    case "command.running":
      return { icon: Icon.CircleProgress, color: Color.Blue };
    case "command.created":
    case "pending":
      return { icon: Icon.Clock, color: Color.Yellow };
    default:
      return { icon: Icon.Circle, color: Color.SecondaryText };
  }
}

export function getDomainStatusIcon(status: DomainStatus): { icon: Icon; color: Color } {
  switch (status) {
    case "verified":
      return { icon: Icon.CheckCircle, color: Color.Green };
    case "pending":
      return { icon: Icon.Clock, color: Color.Yellow };
    case "failed":
      return { icon: Icon.XMarkCircle, color: Color.Red };
    case "disabled":
      return { icon: Icon.MinusCircle, color: Color.SecondaryText };
    default:
      return { icon: Icon.Circle, color: Color.SecondaryText };
  }
}

export function getLogLevelIcon(level: LogLevel): { icon: Icon; color: Color } {
  switch (level) {
    case "error":
      return { icon: Icon.ExclamationMark, color: Color.Red };
    case "warning":
      return { icon: Icon.Warning, color: Color.Yellow };
    case "info":
      return { icon: Icon.Info, color: Color.Blue };
    case "debug":
      return { icon: Icon.Bug, color: Color.SecondaryText };
    default:
      return { icon: Icon.Circle, color: Color.SecondaryText };
  }
}

export function getDatabaseStatusIcon(status: string): { icon: Icon; color: Color } {
  switch (status) {
    case "available":
      return { icon: Icon.CircleFilled, color: Color.Green };
    case "creating":
    case "updating":
    case "restarting":
    case "upgrading":
    case "restoring":
      return { icon: Icon.CircleFilled, color: Color.Blue };
    case "snapshotting_before_archiving":
    case "archiving":
      return { icon: Icon.CircleFilled, color: Color.Yellow };
    case "restore_failed":
    case "deleted":
      return { icon: Icon.CircleFilled, color: Color.Red };
    case "archived":
    case "disabled":
      return { icon: Icon.CircleFilled, color: Color.SecondaryText };
    default:
      return { icon: Icon.Circle, color: Color.SecondaryText };
  }
}

export function getCacheStatusIcon(status: string): { icon: Icon; color: Color } {
  switch (status) {
    case "available":
      return { icon: Icon.CircleFilled, color: Color.Green };
    case "creating":
    case "updating":
      return { icon: Icon.CircleFilled, color: Color.Blue };
    case "deleted":
      return { icon: Icon.CircleFilled, color: Color.Red };
    case "deleting":
      return { icon: Icon.CircleFilled, color: Color.SecondaryText };
    default:
      return { icon: Icon.Circle, color: Color.SecondaryText };
  }
}

export function getBucketStatusIcon(status: string): { icon: Icon; color: Color } {
  switch (status) {
    case "available":
      return { icon: Icon.CircleFilled, color: Color.Green };
    case "creating":
    case "updating":
      return { icon: Icon.CircleFilled, color: Color.Blue };
    case "deleted":
      return { icon: Icon.CircleFilled, color: Color.Red };
    case "deleting":
      return { icon: Icon.CircleFilled, color: Color.SecondaryText };
    default:
      return { icon: Icon.Circle, color: Color.SecondaryText };
  }
}

export function isDeploymentInProgress(status: DeploymentStatus): boolean {
  return (
    status === "pending" ||
    (status.startsWith("build.") && status !== "build.succeeded" && status !== "build.failed") ||
    (status.startsWith("deployment.") && status !== "deployment.succeeded" && status !== "deployment.failed")
  );
}
