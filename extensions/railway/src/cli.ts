import { LogType } from "./railway";

export interface ServiceContext {
  projectId: string;
  environmentId: string;
  serviceId: string;
}

// IDs instead of names, so the command works no matter which project the CLI is linked to
const scopeFlags = ({ projectId, environmentId, serviceId }: ServiceContext): string =>
  `--project ${projectId} --environment ${environmentId} --service ${serviceId}`;

const logTypeFlags: Record<LogType, string> = {
  deploy: "--deployment",
  build: "--build",
  http: "--http",
};

export const cliCommands = {
  linkProject: (projectId: string) => `railway link --project ${projectId}`,
  link: (context: ServiceContext) => `railway link ${scopeFlags(context)}`,
  logs: (context: ServiceContext, options: { type?: LogType; deploymentId?: string } = {}) =>
    ["railway logs", scopeFlags(context), options.type ? logTypeFlags[options.type] : undefined, options.deploymentId]
      .filter(Boolean)
      .join(" "),
  ssh: (context: ServiceContext) => `railway ssh ${scopeFlags(context)}`,
  redeploy: (context: ServiceContext) => `railway redeploy ${scopeFlags(context)} --yes`,
  variables: (context: ServiceContext) => `railway variables ${scopeFlags(context)} --kv`,
};
