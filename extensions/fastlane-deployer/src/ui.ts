import { Color, Icon, List } from "@raycast/api";
import { Deployment, DeploymentStatus, Platform } from "./types";

export function platformIcon(platform: Platform) {
  return platform === "ios" ? Icon.Mobile : Icon.Terminal;
}

export function statusAccessory(status: DeploymentStatus): List.Item.Accessory {
  if (status === "success")
    return {
      text: "Success",
      icon: { source: Icon.CheckCircle, tintColor: Color.Green },
    };
  if (status === "failed")
    return {
      text: "Failed",
      icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
    };
  if (status === "cancelled")
    return {
      text: "Cancelled",
      icon: { source: Icon.Stop, tintColor: Color.Orange },
    };
  return {
    text: "Running",
    icon: { source: Icon.Clock, tintColor: Color.Blue },
  };
}

export function formatDuration(deployment: Deployment) {
  const end = deployment.finishedAt
    ? new Date(deployment.finishedAt).getTime()
    : Date.now();
  const seconds = Math.max(
    0,
    Math.round((end - new Date(deployment.startedAt).getTime()) / 1000),
  );
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

export function deploymentMarkdown(deployment: Deployment) {
  const warnings = deployment.warnings.length
    ? deployment.warnings.map((line) => `- ${line}`).join("\n")
    : "None";
  const errors = deployment.errors.length
    ? deployment.errors.map((line) => `- ${line}`).join("\n")
    : "None";
  const logs = deployment.logs.length
    ? deployment.logs.join("\n")
    : "No logs yet.";

  return `# ${deployment.projectName} - ${deployment.laneName}

**Status:** ${deployment.status}  
**Platform:** ${deployment.platform}  
**Stage:** ${deployment.stage}  
**Estimated Progress:** ~${deployment.progress}%  
**Duration:** ${formatDuration(deployment)}  
**Command:** \`${deployment.command}\`

## Warnings

${warnings}

## Errors

${errors}

## Logs

\`\`\`txt
${logs}
\`\`\`
`;
}
