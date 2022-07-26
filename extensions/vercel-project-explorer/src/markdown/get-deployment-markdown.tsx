import { Deployment } from "../types";
import { getScreenshotImageURL } from "../vercel";

const getDeploymentMarkdown = async (deployment: Deployment) => {
  // @ts-expect-error Property 'id' does not exist on type 'Deployment'.
  const imageURL = await getScreenshotImageURL(deployment.uid || deployment.id);
  return `[![A screenshot of the deployment](${imageURL})](https://${deployment.url})`;
};

export default getDeploymentMarkdown;
