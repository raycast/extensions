import { Toast } from "@raycast/api";
import { GitHubService } from "./github";
import { WORKFLOW_MONITORING } from "../constants";

export class WorkflowMonitoringService {
  constructor(private githubService: GitHubService) {}

  async monitorWorkflowStatus(toast: Toast, eventType: string, serviceName: string): Promise<void> {
    let attempts = 0;

    const checkStatus = async () => {
      try {
        attempts++;

        if (attempts > WORKFLOW_MONITORING.MAX_ATTEMPTS) {
          toast.style = Toast.Style.Failure;
          toast.title = "Monitoring Timeout";
          toast.message = "Workflow monitoring timed out after 5 minutes";
          return;
        }

        const workflowRun = await this.githubService.getLatestWorkflowRun(eventType);

        if (!workflowRun) {
          setTimeout(checkStatus, WORKFLOW_MONITORING.CHECK_INTERVAL);
          return;
        }

        const status = workflowRun.status;
        const conclusion = workflowRun.conclusion;

        if (status === "completed") {
          if (conclusion === "success") {
            toast.style = Toast.Style.Success;
            toast.title = "Deployment Successful! 🎉";
            toast.message = `${serviceName} deployed successfully, bro!`;
          } else if (conclusion === "failure") {
            toast.style = Toast.Style.Failure;
            toast.title = "Deployment Failed ❌";
            toast.message = `${serviceName} deployment failed, bro! Check the workflow logs.`;
          } else if (conclusion === "cancelled") {
            toast.style = Toast.Style.Failure;
            toast.title = "Deployment Cancelled ⚠️";
            toast.message = `${serviceName} deployment was cancelled, bro!`;
          }
        } else if (status === "in_progress") {
          toast.style = Toast.Style.Animated;
          toast.title = "Deployment In Progress ⚡";
          toast.message = `${serviceName} is being deployed... (${Math.floor((attempts * 5) / 60)}min ${(attempts * 5) % 60}s)`;
          setTimeout(checkStatus, WORKFLOW_MONITORING.CHECK_INTERVAL);
        } else {
          toast.style = Toast.Style.Animated;
          toast.title = "Deployment Queued ⏳";
          toast.message = `${serviceName} deployment is queued...`;
          setTimeout(checkStatus, WORKFLOW_MONITORING.CHECK_INTERVAL);
        }
      } catch (error) {
        console.error("Error monitoring workflow:", error);
        if (attempts < WORKFLOW_MONITORING.MAX_ATTEMPTS) {
          setTimeout(checkStatus, WORKFLOW_MONITORING.CHECK_INTERVAL);
        } else {
          toast.style = Toast.Style.Failure;
          toast.title = "Monitoring Error";
          toast.message = "Could not monitor workflow status";
        }
      }
    };

    setTimeout(checkStatus, WORKFLOW_MONITORING.INITIAL_DELAY);
  }
}
