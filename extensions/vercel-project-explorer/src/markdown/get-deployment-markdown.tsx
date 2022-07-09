import { Deployment } from "../types";
import { getScreenshotImageURL } from "../vercel";

const getDeploymentMarkdown = async (deployment: Deployment) => {
  const { uid } = deployment;
  const imageURL = await getScreenshotImageURL(uid);
  return `[![A screenshot of the deployment](${imageURL})](https://${deployment.url})`;
};

export default getDeploymentMarkdown;
