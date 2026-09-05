import { withCloudflareAccessToken, getCloudflareService } from '../oauth';
import { resolveAccount } from './helpers';

interface Input {
  /** Account ID returned by List Zones or List Pages Projects. */
  accountId: string;
  /** Pages project name returned by List Pages Projects or List Deployments. */
  projectName: string;
  /** Pages deployment ID returned by List Deployments. */
  deploymentId: string;
  /** Maximum log lines to return, from 1 to 500. Defaults to 100. */
  limit?: number;
}

async function tool(input: Input) {
  const account = await resolveAccount(input.accountId);
  const project = (await getCloudflareService().listPages(account.id)).find(
    (project) => project.name === input.projectName,
  );
  if (!project) {
    throw new Error(
      'projectName was not found in this account. Call List Pages Projects first.',
    );
  }

  const deployment = await getCloudflareService().getDeployment(
    account.id,
    project.name,
    input.deploymentId,
  );
  const logs = await getCloudflareService().getPageDeploymentLogs(
    account.id,
    project.name,
    deployment.id,
  );
  const limit = Math.min(500, Math.max(1, Math.floor(input.limit ?? 100)));
  const selectedLogs = logs.slice(-limit);
  return {
    accountId: account.id,
    accountName: account.name,
    projectName: project.name,
    deployment: {
      id: deployment.id,
      status: deployment.status,
      environment: deployment.environment,
      branch: deployment.trigger.branch,
      commitHash: deployment.commit.hash,
      commitMessage: deployment.commit.message,
      createdOn: deployment.createdOn,
      url: deployment.url,
    },
    totalLines: logs.length,
    returnedLines: selectedLogs.length,
    truncated: selectedLogs.length < logs.length,
    logs: selectedLogs.map((entry) => ({
      timestamp: entry.timestamp,
      line: entry.line,
    })),
  };
}

export default withCloudflareAccessToken(tool);
