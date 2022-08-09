import { Deployment } from "../types";
import { getScreenshotImageURL } from "../vercel";

const getDeploymentMarkdown = async (deployment: Deployment) => {
  let intro, body, footer;
  intro = `# ${deployment.name}\n`;
  body = footer = "";

  // "BUILDING" | "ERROR" | "FAILED" | "INITIALIZING" | "READY" | "QUEUED" | "CANCELED";

  const state = deployment.readyState || deployment.state;

  // if (deployment.readyState === "INITIALIZING" || deployment.readyState === "BUILDING") {
  //   intro = "Deployment is still building...";
  // } else if (deployment.state === "ERROR") {
  // else {
  //   // @ts-expect-error Property 'id' does not exist on type 'Deployment'.
  //   const imageURL = await getScreenshotImageURL(deployment.uid || deployment.id);
  //   intro = `[![A screenshot of the deployment](${imageURL})](https://${deployment.url})`;
  // }

  const bold = (text: TemplateStringsArray | string) => `**${text}**`;
  const italic = (text: TemplateStringsArray | string) => `*${text}*`;

  switch (state) {
    case "READY": {
      // @ts-expect-error Property 'id' does not exist on type 'Deployment'.
      const imageURL = await getScreenshotImageURL(deployment.uid || deployment.id);

      if (deployment.meta.githubCommitAuthorName) {
        intro += `Created by ` + italic(deployment.meta.githubCommitAuthorName);
        if (deployment.meta.githubCommitRef) {
          intro += " on " + italic(deployment.meta.githubCommitRef);
        }
      }
      body += `[![A screenshot of the deployment](${imageURL})](https://${deployment.url})`;
      break;
    }
    case "BUILDING":
    case "INITIALIZING":
      intro += bold`Deployment is still building...`;
      break;
    case "FAILED":
      intro += bold`Deployment failed.`;
      break;
    case "CANCELED":
      intro += bold`Deployment was canceled.`;
      break;
    case "ERROR": {
      intro += bold`Deployment had an error.`;
      break;
    }
    default:
      intro += bold`Deployment is in an unknown state...`;
  }

  return `${intro}\n\n${body}\n\n${footer}`;
};

export default getDeploymentMarkdown;
