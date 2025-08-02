import { GitHubRepoInfo } from "../types";

export function parseRepoFromUrl(dispatchUrl: string): GitHubRepoInfo {
  const match = dispatchUrl.match(/\/repos\/([^/]+)\/([^/]+)\/dispatches/);
  if (!match) {
    throw new Error("Invalid GitHub workflow dispatch URL format");
  }
  return { owner: match[1], repo: match[2] };
}

export function getWorkflowStatusIcon(status: string, conclusion?: string | null): string {
  if (status === "completed") {
    return conclusion === "success" ? "✅" : conclusion === "failure" ? "❌" : "⚠️";
  }
  return status === "in_progress" ? "⚡" : "⏳";
}

export function getEventTypeForService(serviceValue: string, isNoPush = false): string {
  switch (serviceValue) {
    case "api-server":
      return isNoPush ? "deploy-api-server" : "push-and-deploy-api-server";
    case "suite-backend":
      return isNoPush ? "deploy-suite-backend" : "push-and-deploy-suite-backend";
    case "mgmt-server":
      return "deploy-mgmt-server";
    default:
      return `deploy-${serviceValue}`;
  }
}
