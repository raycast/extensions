import { Deployment, Project } from "../types";
import { getScreenshotImageURL } from "../vercel";
/*accountId: string;
  analytics?: {
    id: string;
    canceledAt: number | null;
    disabledAt: number;
    enabledAt: number;
    paidAt?: number;
    sampleRatePercent?: number | null;
    spendLimitInDollars?: number | null;
  };
  autoExposeSystemEnvs?: boolean;
  buildCommand?: string | null;
  commandForIgnoringBuildStep?: string | null;
  createdAt?: number;
  devCommand?: string | null;
  directoryListing: boolean;
  installCommand?: string | null;
  env?: {
    id?: string;
    type: "system" | "secret" | "encrypted" | "plain";
    key: string;
    value: string;
    configurationId?: string | null;
    createdAt?: number;
    updatedAt?: number;
    target?:
      | ("production" | "preview" | "development" | "preview" | "development")[]
      | ("production" | "preview" | "development" | "preview" | "development");
    gitBranch?: string;
    createdBy?: string | null;
    updatedBy?: string | null;
  }[];
  framework?: string | null;
  gitForkProtection?: boolean;
  id: string;
  latestDeployments?: {
    alias?: string[];
    aliasAssigned?: (number | boolean) | null;
    builds?: {
      use: string;
      src?: string;
      dest?: string;
    }[];
    createdAt: number;
    createdIn: string;
    creator: {
      email: string;
      githubLogin?: string;
      gitlabLogin?: string;
      uid: string;
      username: string;
    } | null;
    deploymentHostname: string;
    name: string;
    forced?: boolean;
    id: string;
    meta?: { [key: string]: string };
    plan: string;
    private: boolean;
    readyState: string;
    requestedAt?: number;
    target?: string | null;
    teamId?: string | null;
    type: string;
    url: string;
    userId: string;
    withCache?: boolean;
  }[];
  link?:
    | {
        org?: string;
        repo?: string;
        repoId?: number;
        type?: "github";
        createdAt?: number;
        deployHooks: {
          createdAt?: number;
          id: string;
          name: string;
          ref: string;
          url: string;
        }[];
        gitCredentialId?: string;
        updatedAt?: number;
        sourceless?: boolean;
        productionBranch?: string;
      }
    | {
        projectId?: string;
        projectName?: string;
        projectNameWithNamespace?: string;
        projectNamespace?: string;
        projectUrl?: string;
        type?: "gitlab";
        createdAt?: number;
        deployHooks: {
          createdAt?: number;
          id: string;
          name: string;
          ref: string;
          url: string;
        }[];
        gitCredentialId?: string;
        updatedAt?: number;
        sourceless?: boolean;
        productionBranch?: string;
      }
    | {
        name?: string;
        slug?: string;
        owner?: string;
        type?: "bitbucket";
        uuid?: string;
        workspaceUuid?: string;
        createdAt?: number;
        deployHooks: {
          createdAt?: number;
          id: string;
          name: string;
          ref: string;
          url: string;
        }[];
        gitCredentialId?: string;
        updatedAt?: number;
        sourceless?: boolean;
        productionBranch?: string;
      };
  name: string;
  nodeVersion: "14.x" | "12.x" | "10.x";
  outputDirectory?: string | null;
  passwordProtection?: {
    deploymentType: "preview" | "all";
  } | null;
  publicSource?: boolean | null;
  rootDirectory?: string | null;
  serverlessFunctionRegion?: string | null;
  sourceFilesOutsideRootDirectory?: boolean;
  ssoProtection?: {
    deploymentType: "preview" | "all";
  } | null;
  targets?: { [key: string]: string };
  transferCompletedAt?: number;
  transferStartedAt?: number;
  transferToAccountId?: string;
  transferredFromAccountId?: string;
  updatedAt?: number;
  live?: boolean;*/

const getDeploymentMarkdown = async (deployment: Deployment) => {
  // we want the first domain, the last deploy time, the last commit message,
  // and the last commit author
  // console.log(project.latestDeployments?.length && getScreenshotImageURL(project.latestDeployments[0].id))
  const { uid } = deployment;

  const imageURL = await getScreenshotImageURL(uid);

  return `![](${imageURL})`;
};

export default getDeploymentMarkdown;
