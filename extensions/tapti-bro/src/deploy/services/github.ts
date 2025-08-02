import axios from "axios";
import { Preferences, WorkflowRun } from "../types";
import { parseRepoFromUrl } from "../utils";
import { WORKFLOW_MONITORING } from "../constants";

export class GitHubService {
  constructor(private preferences: Preferences) {}

  async deployApiServer(params: string[], dispatchUrl: string, token: string): Promise<string> {
    const isPushDisabled = params.includes("--no-push");
    const eventType = isPushDisabled ? "deploy-api-server" : "push-and-deploy-api-server";

    const response = await axios.post(
      dispatchUrl,
      { event_type: eventType },
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (response.status >= 200 && response.status < 300) {
      return isPushDisabled
        ? "GitHub will redeploy the API server, bro!"
        : "GitHub will push new image to ECR and deploy API server, bro!";
    } else {
      throw new Error("GitHub is not listening, bro!");
    }
  }

  async deploySuiteBackend(params: string[], dispatchUrl: string, token: string): Promise<string> {
    const isPushDisabled = params.includes("--no-push");
    const eventType = isPushDisabled ? "deploy-suite-backend" : "push-and-deploy-suite-backend";

    const response = await axios.post(
      dispatchUrl,
      { event_type: eventType },
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (response.status >= 200 && response.status < 300) {
      return isPushDisabled
        ? "GitHub will redeploy the suite backend, bro!"
        : "GitHub will push new image to ECR and deploy suite backend, bro!";
    } else {
      throw new Error("GitHub is not listening, bro!");
    }
  }

  async deployMgmtServer(params: string[], dispatchUrl: string, token: string): Promise<string> {
    let host = "192.168.1.100";

    for (const param of params) {
      if (param.startsWith("--host=")) {
        host = param.split("=")[1];
      }
    }

    const response = await axios.post(
      dispatchUrl,
      {
        event_type: "deploy-mgmt-server",
        client_payload: { host },
      },
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (response.status >= 200 && response.status < 300) {
      return "GitHub will deploy the management server, bro!";
    } else {
      throw new Error("GitHub is not listening, bro!");
    }
  }

  async triggerGitWorkflow(appName: string, dispatchUrl: string, token: string): Promise<string> {
    const response = await axios.post(
      dispatchUrl,
      { event_type: `deploy-${appName}` },
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (response.status >= 200 && response.status < 300) {
      return `GitHub will deploy the ${appName}, bro!`;
    } else {
      throw new Error("GitHub is not listening, bro!");
    }
  }

  async deployService(appName: string, params: string = ""): Promise<string> {
    const { githubToken, githubWorkflowDispatchUrl } = this.preferences;

    if (!githubWorkflowDispatchUrl) {
      throw new Error("GitHub workflow dispatch URL not configured in preferences");
    }

    if (!githubToken) {
      throw new Error("GitHub token not configured in preferences");
    }

    const parameters = params ? params.split(" ").filter((p) => p.trim()) : [];

    switch (appName) {
      case "api-server":
        return this.deployApiServer(parameters, githubWorkflowDispatchUrl, githubToken);
      case "suite-backend":
        return this.deploySuiteBackend(parameters, githubWorkflowDispatchUrl, githubToken);
      case "mgmt-server":
        return this.deployMgmtServer(parameters, githubWorkflowDispatchUrl, githubToken);
      default:
        return this.triggerGitWorkflow(appName, githubWorkflowDispatchUrl, githubToken);
    }
  }

  async fetchRunningWorkflows(): Promise<WorkflowRun[]> {
    const { githubToken, githubWorkflowDispatchUrl } = this.preferences;
    const { owner, repo } = parseRepoFromUrl(githubWorkflowDispatchUrl);

    console.log(`Fetching workflows for ${owner}/${repo}`);

    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/actions/runs`, {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      },
      params: {
        per_page: 20,
      },
    });

    console.log(`Found ${response.data.workflow_runs?.length || 0} total workflow runs`);

    const allRuns = response.data.workflow_runs || [];
    const activeRuns = allRuns.filter(
      (run: WorkflowRun) =>
        run.status === "in_progress" ||
        run.status === "queued" ||
        (run.status === "completed" &&
          new Date(run.updated_at).getTime() > Date.now() - WORKFLOW_MONITORING.RECENT_WORKFLOWS_WINDOW),
    );

    console.log(`Found ${activeRuns.length} active/recent workflow runs`);
    return activeRuns;
  }

  async getLatestWorkflowRun(): Promise<WorkflowRun | null> {
    const { githubToken, githubWorkflowDispatchUrl } = this.preferences;
    const { owner, repo } = parseRepoFromUrl(githubWorkflowDispatchUrl);

    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/actions/runs`, {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      },
      params: {
        event: "repository_dispatch",
        per_page: 10,
      },
    });

    const runs = response.data.workflow_runs;
    const latestRun = runs.find((run: WorkflowRun) => run.created_at > new Date(Date.now() - 60000).toISOString());

    return latestRun || null;
  }

  async fetchWorkflowJobs(workflowRunId: number) {
    const { githubToken, githubWorkflowDispatchUrl } = this.preferences;
    const { owner, repo } = parseRepoFromUrl(githubWorkflowDispatchUrl);

    return axios.get(`https://api.github.com/repos/${owner}/${repo}/actions/runs/${workflowRunId}/jobs`, {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
  }

  async fetchJobLogs(jobId: number) {
    const { githubToken, githubWorkflowDispatchUrl } = this.preferences;
    const { owner, repo } = parseRepoFromUrl(githubWorkflowDispatchUrl);

    return axios.get(`https://api.github.com/repos/${owner}/${repo}/actions/jobs/${jobId}/logs`, {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
  }
}
