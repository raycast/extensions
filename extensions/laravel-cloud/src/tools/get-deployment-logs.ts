import { getDeploymentLogs } from "../api/deployments";

type Input = {
  /** The ID of the deployment whose build/deploy logs to retrieve */
  deploymentId: string;
};

export default async function (input: Input) {
  const response = await getDeploymentLogs(input.deploymentId);
  return {
    deployment_status: response.meta.deployment_status,
    build: {
      available: response.data.build.available,
      steps: response.data.build.steps.map((s) => ({
        step: s.step,
        status: s.status,
        description: s.description,
        output: s.output ?? null,
        duration_ms: s.duration_ms ?? null,
      })),
    },
    deploy: {
      available: response.data.deploy.available,
      steps: response.data.deploy.steps.map((s) => ({
        step: s.step,
        status: s.status,
        description: s.description,
        output: s.output ?? null,
        duration_ms: s.duration_ms ?? null,
      })),
    },
  };
}
