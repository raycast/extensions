import { showHUD, showToast, Toast } from "@raycast/api";
import { getRadarrInstances } from "./config";
import { testConnection } from "./hooks/useRadarrAPI";
import type { RadarrInstance, HealthCheck } from "./types";

interface SystemHealthSummary {
  instance: RadarrInstance;
  isOnline: boolean;
  version?: string;
  healthIssues: HealthCheck[];
  errorMessage?: string;
}

async function checkInstanceHealth(instance: RadarrInstance): Promise<SystemHealthSummary> {
  try {
    const isOnline = await testConnection(instance);

    if (!isOnline) {
      return {
        instance,
        isOnline: false,
        healthIssues: [],
        errorMessage: "Connection failed",
      };
    }

    const healthResponse = await fetch(`${instance.url}/api/v3/health`, {
      headers: {
        "X-Api-Key": instance.apiKey,
        "Content-Type": "application/json",
      },
    });

    const statusResponse = await fetch(`${instance.url}/api/v3/system/status`, {
      headers: {
        "X-Api-Key": instance.apiKey,
        "Content-Type": "application/json",
      },
    });

    const healthData: HealthCheck[] = healthResponse.ok ? await healthResponse.json() : [];
    const statusData = statusResponse.ok ? await statusResponse.json() : null;

    return {
      instance,
      isOnline: true,
      version: statusData?.version,
      healthIssues: healthData.filter(issue => issue.type === "error" || issue.type === "warning"),
    };
  } catch (error) {
    return {
      instance,
      isOnline: false,
      healthIssues: [],
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function formatHealthSummary(summaries: SystemHealthSummary[]): string {
  const onlineInstances = summaries.filter(s => s.isOnline);
  const offlineInstances = summaries.filter(s => !s.isOnline);
  const instancesWithIssues = onlineInstances.filter(s => s.healthIssues.length > 0);

  let message = "";

  if (onlineInstances.length > 0) {
    message += `✅ Online: ${onlineInstances.map(s => s.instance.name).join(", ")}`;
  }

  if (offlineInstances.length > 0) {
    if (message) message += "\n";
    message += `❌ Offline: ${offlineInstances.map(s => s.instance.name).join(", ")}`;
  }

  if (instancesWithIssues.length > 0) {
    if (message) message += "\n";
    message += `⚠️ Issues: ${instancesWithIssues.map(s => `${s.instance.name} (${s.healthIssues.length})`).join(", ")}`;
  }

  return message || "No instances configured";
}

function getOverallStatus(summaries: SystemHealthSummary[]): { style: Toast.Style; title: string } {
  const hasOfflineInstances = summaries.some(s => !s.isOnline);
  const hasHealthIssues = summaries.some(s => s.healthIssues.some(issue => issue.type === "error"));
  const hasWarnings = summaries.some(s => s.healthIssues.some(issue => issue.type === "warning"));

  if (hasOfflineInstances || hasHealthIssues) {
    return {
      style: Toast.Style.Failure,
      title: "Radarr Issues Detected",
    };
  }

  if (hasWarnings) {
    return {
      style: Toast.Style.Animated,
      title: "Radarr Warnings",
    };
  }

  return {
    style: Toast.Style.Success,
    title: "All Radarr Instances Healthy",
  };
}

export default async function SystemStatus() {
  try {
    const instances = getRadarrInstances();

    if (instances.length === 0) {
      await showHUD("No Radarr instances configured");
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Checking Radarr Status...",
    });

    const healthPromises = instances.map(checkInstanceHealth);
    const healthSummaries = await Promise.all(healthPromises);

    const overallStatus = getOverallStatus(healthSummaries);
    const summaryMessage = formatHealthSummary(healthSummaries);

    await showToast({
      style: overallStatus.style,
      title: overallStatus.title,
      message: summaryMessage,
    });

    // Log detailed health information for debugging
    healthSummaries.forEach(summary => {
      console.log(`Radarr Instance: ${summary.instance.name}`);
      console.log(`  Online: ${summary.isOnline}`);
      if (summary.version) {
        console.log(`  Version: ${summary.version}`);
      }
      if (summary.errorMessage) {
        console.log(`  Error: ${summary.errorMessage}`);
      }
      if (summary.healthIssues.length > 0) {
        console.log(`  Health Issues:`);
        summary.healthIssues.forEach(issue => {
          console.log(`    - ${issue.type.toUpperCase()}: ${issue.message}`);
        });
      }
    });

    // Show detailed issues in HUD for critical problems
    const criticalIssues = healthSummaries.filter(
      s => !s.isOnline || s.healthIssues.some(issue => issue.type === "error"),
    );

    if (criticalIssues.length > 0) {
      const criticalMessages = criticalIssues.map(s => {
        if (!s.isOnline) {
          return `${s.instance.name}: Connection failed`;
        }

        const errorIssues = s.healthIssues.filter(issue => issue.type === "error");
        return `${s.instance.name}: ${errorIssues.map(issue => issue.message).join(", ")}`;
      });

      await showHUD(`Critical Issues:\n${criticalMessages.join("\n")}`);
    }
  } catch (error) {
    console.error("System status check failed:", error);

    await showToast({
      style: Toast.Style.Failure,
      title: "Status Check Failed",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
