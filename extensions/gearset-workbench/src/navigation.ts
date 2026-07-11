const GEARSET_APP_URL = "https://app.gearset.com";

export const GEARSET_COMPARE_DEPLOY_URL = `${GEARSET_APP_URL}/configure`;
export const GEARSET_DEPLOYMENT_HISTORY_URL = `${GEARSET_APP_URL}/deployments/deployed`;

export function gearsetDeploymentUrl(deploymentId: string): string {
  const url = new URL("/finished", GEARSET_APP_URL);
  url.searchParams.set("deploymentId", deploymentId);
  return url.toString();
}
