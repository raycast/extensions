import { List, ActionPanel, Action, showToast, Toast, Icon, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";

// Import modular components
import type { Preferences, DeployableService, WorkflowRun } from "./deploy/types";
import { AVAILABLE_APPS } from "./deploy/constants";
import { getWorkflowStatusIcon, getEventTypeForService, parseRepoFromUrl } from "./deploy/utils";
import { GitHubService } from "./deploy/services/github";
import { NotificationService } from "./deploy/services/notifications";
import { WorkflowMonitoringService } from "./deploy/services/monitoring";
import { WorkflowDetailView } from "./deploy/components/WorkflowDetailView";

export default function DeployCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const [runningWorkflows, setRunningWorkflows] = useState<WorkflowRun[]>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(true);

  // Initialize services
  const githubService = new GitHubService(preferences);
  const notificationService = new NotificationService(preferences.userName);
  const monitoringService = new WorkflowMonitoringService(githubService);

  useEffect(() => {
    fetchRunningWorkflows();
  }, []);

  async function fetchRunningWorkflows() {
    try {
      const workflows = await githubService.fetchRunningWorkflows();
      setRunningWorkflows(workflows);
    } catch (error) {
      console.error("Error fetching running workflows:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch workflows",
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setIsLoadingWorkflows(false);
    }
  }

  async function handleDeploy(service: DeployableService) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Triggering Deployment",
      message: `Starting deployment for ${service.title}...`,
    });

    try {
      const result = await githubService.deployService(service.value);

      toast.style = Toast.Style.Animated;
      toast.title = "Deployment Triggered ✅";
      toast.message = result;

      // Send Google Chat notification
      await notificationService.sendGoogleChatNotification(service.title, "deployment");

      // Get event type and start monitoring
      const eventType = getEventTypeForService(service.value);
      await monitoringService.monitorWorkflowStatus(toast, eventType, service.title);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Deployment Failed";
      toast.message = error instanceof Error ? error.message : "Unknown error occurred";
    }
  }

  async function handleDeployWithNoECR(service: DeployableService) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Triggering Deployment",
      message: `Starting deployment for ${service.title} (no ECR push)...`,
    });

    try {
      const result = await githubService.deployService(service.value, "--no-push");

      toast.style = Toast.Style.Animated;
      toast.title = "Deployment Triggered ✅";
      toast.message = result;

      // Send Google Chat notification
      await notificationService.sendGoogleChatNotification(service.title, "deployment (no ECR push)");

      // Get event type and start monitoring
      const eventType = getEventTypeForService(service.value, true);
      await monitoringService.monitorWorkflowStatus(toast, eventType, service.title);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Deployment Failed";
      toast.message = error instanceof Error ? error.message : "Unknown error occurred";
    }
  }

  return (
    <List searchBarPlaceholder="Search services to deploy..." isLoading={isLoadingWorkflows}>
      <List.Section title={`🔄 Workflows (${runningWorkflows.length})`}>
        {runningWorkflows.length > 0 ? (
          runningWorkflows.map((workflow) => {
            const statusIcon = getWorkflowStatusIcon(workflow.status, workflow.conclusion);
            const subtitle = `${workflow.status}${workflow.conclusion ? ` (${workflow.conclusion})` : ""} • Run #${workflow.run_number} • ${workflow.head_branch}`;

            return (
              <List.Item
                key={workflow.id}
                title={`${statusIcon} ${workflow.name}`}
                subtitle={subtitle}
                icon={Icon.Clock}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Details"
                      icon={Icon.Eye}
                      target={<WorkflowDetailView workflowRun={workflow} />}
                    />
                    <Action.OpenInBrowser
                      title="Open in GitHub"
                      url={workflow.html_url}
                      icon={Icon.Globe}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={fetchRunningWorkflows}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })
        ) : (
          <List.Item
            title="No recent workflows"
            subtitle={isLoadingWorkflows ? "Loading..." : "No workflows found in the last 10 minutes"}
            icon={Icon.Info}
            actions={
              <ActionPanel>
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchRunningWorkflows} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      <List.Section title="🚀 Deploy Services">
        {AVAILABLE_APPS.map((service: DeployableService) => (
          <List.Item
            key={service.value}
            title={service.title}
            subtitle={service.subtitle}
            icon={service.icon}
            actions={
              <ActionPanel>
                <Action title="Deploy" icon={Icon.Rocket} onAction={() => handleDeploy(service)} />
                {(service.value === "api-server" || service.value === "suite-backend") && (
                  <Action
                    title="Deploy (No Ecr Push)"
                    icon={Icon.ArrowClockwise}
                    onAction={() => handleDeployWithNoECR(service)}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                )}
                <Action
                  title="Refresh Workflows"
                  icon={Icon.ArrowClockwise}
                  onAction={fetchRunningWorkflows}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action
                  title="Debug Config"
                  icon={Icon.Bug}
                  onAction={async () => {
                    try {
                      const { owner, repo } = parseRepoFromUrl(preferences.githubWorkflowDispatchUrl);
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Config Debug",
                        message: `Owner: ${owner}, Repo: ${repo}`,
                      });
                    } catch (error) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Config Error",
                        message: error instanceof Error ? error.message : "Unknown error",
                      });
                    }
                  }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
