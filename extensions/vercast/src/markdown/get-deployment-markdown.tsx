import { Deployment, Team } from "../types";
import { getScreenshotImageURL } from "../vercel";

const getDeploymentMarkdown = async (deployment: Deployment, team?: Team) => {
  let intro, body, footer;
  intro = `# ${deployment.name}\n`;
  body = footer = "";

  const state = deployment.readyState || deployment.state;

  const bold = (text: TemplateStringsArray | string) => `**${text}**`;
  // const italic = (text: TemplateStringsArray | string) => `*${text}*`;

  switch (state) {
    case "READY": {
      // @ts-expect-error Property 'id' does not exist on type 'Deployment'.
      const imageURL = await getScreenshotImageURL(deployment.uid || deployment.id, team?.id);
      if (imageURL) {
        body += `[![A screenshot of the deployment](${imageURL})](https://${deployment.url})`;
      } else {
        body += `No screenshot available`;
      }
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
