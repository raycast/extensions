import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

const backboardUrl = "https://backboard.railway.com/graphql/v2";
const backboardInternalUrl = "https://backboard.railway.com/graphql/internal";
export const railwayWebUrl = "https://railway.com";

export const projectUrl = (projectId: string, page?: string): string =>
  `${railwayWebUrl}/project/${projectId}/${page ?? ""}`;

export const serviceUrl = (projectId: string, serviceId: string, environmentId: string): string =>
  `${railwayWebUrl}/project/${projectId}/service/${serviceId}?environmentId=${environmentId}`;

export const deploymentUrl = (
  projectId: string,
  serviceId: string,
  environmentId: string,
  deploymentId: string,
): string => `${serviceUrl(projectId, serviceId, environmentId)}&id=${deploymentId}`;

export const workspaceUsageUrl = (workspaceId: string): string =>
  `${railwayWebUrl}/workspace/usage?workspaceId=${workspaceId}`;

export const templatePageUrl = (code: string): string => `${railwayWebUrl}/template/${code}`;
export const templateDeployUrl = (code: string): string => `${railwayWebUrl}/new/template/${code}`;

interface Error {
  message: string;
  locations?: Array<{
    line: number;
    column: number;
  }>;
  path?: string[];
  extensions?: {
    code: string;
  };
  traceId: string;
}

export const tokenSettingsUrl = `${railwayWebUrl}/account/tokens`;

// The token is optional because Search Templates works without one
export const hasApiToken = (): boolean => Boolean(getPreferenceValues<Preferences>().railwayApiKey?.trim());

export const isProjectToken = (): boolean => getPreferenceValues<Preferences>().tokenType === "project";

// Same as the CLI: project tokens (RAILWAY_TOKEN) use their own header, account and workspace tokens are bearer tokens
const authHeaders = (): Record<string, string> => {
  const token = getPreferenceValues<Preferences>().railwayApiKey?.trim() ?? "";
  return isProjectToken() ? { "Project-Access-Token": token } : { Authorization: `Bearer ${token}` };
};

export const gqlRequest = async <T>(query: string, variables?: Record<string, unknown>): Promise<T | null> => {
  const res = await fetch(backboardUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ query, variables }),
  });

  const json = (await res.json()) as { errors: Error[]; data?: null } | { data: T };
  if ("errors" in json) throw new Error(json.errors[0].message);
  const data = json?.data || null;

  return data;
};

export interface WorkspaceGQL {
  id: string;
  name: string;
}

export interface ProjectGQL {
  id: string;
  name: string;
  updatedAt: string;
  description: string | null;
  isPublic: boolean;
  workspace: WorkspaceGQL | null;
}

type ProjectNodeGQL = Omit<ProjectGQL, "workspace"> & { deletedAt: string | null };

const projectFields = `
  id
  name
  description
  updatedAt
  isPublic
  deletedAt
`;

interface UserProjectsGQL {
  me: {
    workspaces: Array<WorkspaceGQL & { projects: { edges: Array<{ node: ProjectNodeGQL }> } }>;
  };
  externalWorkspaces: Array<WorkspaceGQL & { projects: ProjectNodeGQL[] }>;
}

// Mirrors the CLI's `railway list`: every workspace the user is a member of, plus workspaces shared with them
const userProjectsQuery = `query userProjects {
  me {
    workspaces {
      id
      name
      projects(first: 500) {
        edges {
          node {
            ${projectFields}
          }
        }
      }
    }
  }
  externalWorkspaces {
    id
    name
    projects {
      ${projectFields}
    }
  }
}`;

interface TokenProjectsGQL {
  projects: {
    edges: Array<{ node: ProjectNodeGQL & { workspace: WorkspaceGQL | null } }>;
  };
}

// Workspace tokens have no user behind them, so `me` is refused and only the token's own projects are listed
const tokenProjectsQuery = `query tokenProjects {
  projects {
    edges {
      node {
        ${projectFields}
        workspace {
          id
          name
        }
      }
    }
  }
}`;

interface ProjectTokenGQL {
  projectToken: {
    project: ProjectNodeGQL & { workspace: WorkspaceGQL | null };
    environment: { id: string; name: string };
  };
}

const projectTokenQuery = `query projectToken {
  projectToken {
    project {
      ${projectFields}
      workspace {
        id
        name
      }
    }
    environment {
      id
      name
    }
  }
}`;

const fetchProjectNodes = async (): Promise<Array<ProjectNodeGQL & { workspace: WorkspaceGQL | null }>> => {
  if (isProjectToken()) {
    const res = await gqlRequest<ProjectTokenGQL>(projectTokenQuery);
    return res ? [res.projectToken.project] : [];
  }

  let res: UserProjectsGQL | null;
  try {
    res = await gqlRequest<UserProjectsGQL>(userProjectsQuery);
  } catch {
    const tokenRes = await gqlRequest<TokenProjectsGQL>(tokenProjectsQuery);
    return tokenRes?.projects.edges.map((e) => e.node) ?? [];
  }
  if (!res) return [];

  const memberProjects = res.me.workspaces.flatMap(({ projects, ...workspace }) =>
    projects.edges.map((e) => ({ ...e.node, workspace })),
  );
  const externalProjects = res.externalWorkspaces.flatMap(({ projects, ...workspace }) =>
    projects.map((p) => ({ ...p, workspace })),
  );

  // A project can show up through both a membership and an external share; keep the membership one
  const seen = new Set<string>();
  return [...memberProjects, ...externalProjects].filter((p) => !seen.has(p.id) && seen.add(p.id));
};

export const fetchProjects = async (): Promise<ProjectGQL[]> => {
  const projects = await fetchProjectNodes();

  return projects
    .filter((p) => !p.deletedAt)
    .map(({ deletedAt: _deletedAt, ...p }) => p)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const fetchWorkspaces = async (): Promise<WorkspaceGQL[]> => {
  if (isProjectToken()) return [];

  let res: { me: { workspaces: WorkspaceGQL[] }; externalWorkspaces: WorkspaceGQL[] } | null;
  try {
    res = await gqlRequest(`query workspaces {
      me {
        workspaces {
          id
          name
        }
      }
      externalWorkspaces {
        id
        name
      }
    }`);
  } catch {
    // Workspace tokens: use the workspace their projects belong to
    const tokenRes = await gqlRequest<TokenProjectsGQL>(tokenProjectsQuery);
    res = {
      me: { workspaces: (tokenRes?.projects.edges ?? []).flatMap((e) => (e.node.workspace ? [e.node.workspace] : [])) },
      externalWorkspaces: [],
    };
  }

  const seen = new Set<string>();
  return [...(res?.me.workspaces ?? []), ...(res?.externalWorkspaces ?? [])]
    .map(({ id, name }) => ({ id, name }))
    .filter((w) => !seen.has(w.id) && seen.add(w.id));
};

export interface TemplateGQL {
  id: string;
  code: string;
  name: string;
  description: string | null;
  image: string | null;
  deploymentCount: number;
  healthScore: number | null;
  creatorName: string | null;
  isVerified: boolean;
}

interface TemplateSearchGQL {
  templateSearch: {
    edges: Array<{ node: TemplateGQL }>;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

const templateSearchQuery = `query templateSearch($query: String!, $first: Int, $after: String) {
  templateSearch(query: $query, first: $first, after: $after) {
    edges {
      node {
        id
        code
        name
        description
        image
        deploymentCount
        healthScore
        creatorName
        isVerified
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}`;

export interface TemplateSearchResult {
  templates: TemplateGQL[];
  hasNextPage: boolean;
  endCursor: string | null;
}

interface TemplateDetailGQL {
  template: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    readme: string | null;
  } | null;
}

const templateDetailQuery = `query templateDetail($code: String!) {
  template(code: $code) {
    id
    code
    name
    description
    readme
  }
}`;

export const fetchTemplateDetail = async (code: string): Promise<string | null> => {
  const res = await fetch(backboardInternalUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operationName: "templateDetail",
      query: templateDetailQuery,
      variables: { code },
    }),
  });

  const json = (await res.json()) as { errors?: Error[]; data?: TemplateDetailGQL };
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data?.template?.readme ?? null;
};

export const fetchTemplates = async (query: string, after?: string): Promise<TemplateSearchResult> => {
  const res = await fetch(backboardInternalUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operationName: "templateSearch",
      query: templateSearchQuery,
      variables: { query, first: 50, after },
    }),
  });

  const json = (await res.json()) as { errors?: Error[]; data?: TemplateSearchGQL };
  if (json.errors) throw new Error(json.errors[0].message);
  if (!json.data) return { templates: [], hasNextPage: false, endCursor: null };

  return {
    templates: json.data.templateSearch.edges.map((e) => e.node),
    hasNextPage: json.data.templateSearch.pageInfo.hasNextPage,
    endCursor: json.data.templateSearch.pageInfo.endCursor,
  };
};

export type DeploymentStatus =
  | "BUILDING"
  | "CRASHED"
  | "DEPLOYING"
  | "FAILED"
  | "INITIALIZING"
  | "NEEDS_APPROVAL"
  | "QUEUED"
  | "REMOVED"
  | "REMOVING"
  | "SKIPPED"
  | "SLEEPING"
  | "SUCCESS"
  | "WAITING";

export interface DeploymentMeta {
  commitMessage?: string;
  commitHash?: string;
  commitAuthor?: string;
  branch?: string;
  repo?: string;
  image?: string;
  reason?: string;
}

export interface DeploymentGQL {
  id: string;
  status: DeploymentStatus;
  createdAt: string;
  canRedeploy: boolean;
  environmentId: string;
  snapshotId: string | null;
  meta: DeploymentMeta | null;
}

const deploymentFields = `
  id
  status
  createdAt
  canRedeploy
  environmentId
  snapshotId
  meta
`;

export interface EnvironmentGQL {
  id: string;
  name: string;
}

interface ProjectEnvironmentsGQL {
  project: {
    environments: {
      edges: Array<{ node: EnvironmentGQL & { canAccess: boolean; deletedAt: string | null } }>;
    };
  };
}

export const fetchEnvironments = async (projectId: string): Promise<EnvironmentGQL[]> => {
  // A project token is scoped to a single environment
  if (isProjectToken()) {
    const tokenRes = await gqlRequest<ProjectTokenGQL>(projectTokenQuery);
    return tokenRes ? [tokenRes.projectToken.environment] : [];
  }

  const res = await gqlRequest<ProjectEnvironmentsGQL>(
    `query projectEnvironments($id: String!) {
      project(id: $id) {
        environments {
          edges {
            node {
              id
              name
              canAccess
              deletedAt
            }
          }
        }
      }
    }`,
    { id: projectId },
  );

  const environments = (res?.project.environments.edges ?? [])
    .map((e) => e.node)
    .filter((e) => e.canAccess && !e.deletedAt)
    .map(({ id, name }) => ({ id, name }));

  // Match the CLI/dashboard default of landing on production first
  return environments.sort((a, b) => Number(b.name === "production") - Number(a.name === "production"));
};

export interface ServiceInstanceGQL {
  id: string;
  serviceId: string;
  serviceName: string;
  numReplicas: number | null;
  cronSchedule: string | null;
  source: { repo: string | null; image: string | null } | null;
  domains: {
    serviceDomains: Array<{ domain: string }>;
    customDomains: Array<{ domain: string }>;
  };
  service: { icon: string | null };
  latestDeployment: DeploymentGQL | null;
}

interface ServiceInstancesConnectionGQL {
  edges: Array<{ node: ServiceInstanceGQL }>;
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

interface EnvironmentInstancesGQL {
  environment: {
    serviceInstances: ServiceInstancesConnectionGQL;
  };
}

const serviceInstancesPageSize = 100;

const environmentInstancesQuery = `query environmentInstances($environmentId: String!, $projectId: String!, $first: Int, $after: String) {
  environment(id: $environmentId, projectId: $projectId) {
    serviceInstances(first: $first, after: $after) {
      edges {
        node {
          id
          serviceId
          serviceName
          numReplicas
          cronSchedule
          source {
            repo
            image
          }
          domains {
            serviceDomains {
              domain
            }
            customDomains {
              domain
            }
          }
          service {
            icon
          }
          latestDeployment {
            ${deploymentFields}
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}`;

export const fetchServiceInstances = async (
  projectId: string,
  environmentId: string,
): Promise<ServiceInstanceGQL[]> => {
  const instances: ServiceInstanceGQL[] = [];
  let after: string | null = null;

  do {
    const res: EnvironmentInstancesGQL | null = await gqlRequest<EnvironmentInstancesGQL>(environmentInstancesQuery, {
      environmentId,
      projectId,
      first: serviceInstancesPageSize,
      after,
    });

    const connection: ServiceInstancesConnectionGQL | undefined = res?.environment.serviceInstances;
    instances.push(...(connection?.edges.map((e) => e.node) ?? []));
    after = connection?.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
  } while (after);

  return instances.sort((a, b) => a.serviceName.localeCompare(b.serviceName));
};

interface DeploymentsGQL {
  deployments: {
    edges: Array<{ node: DeploymentGQL }>;
  };
}

export const fetchDeployments = async (
  projectId: string,
  environmentId: string,
  serviceId: string,
): Promise<DeploymentGQL[]> => {
  const res = await gqlRequest<DeploymentsGQL>(
    `query deployments($input: DeploymentListInput!, $first: Int) {
      deployments(input: $input, first: $first) {
        edges {
          node {
            ${deploymentFields}
          }
        }
      }
    }`,
    { input: { projectId, environmentId, serviceId }, first: 50 },
  );

  return (res?.deployments.edges ?? [])
    .map((e) => e.node)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const redeployDeployment = async (id: string): Promise<void> => {
  await gqlRequest(
    `mutation deploymentRedeploy($id: String!) {
      deploymentRedeploy(id: $id) {
        id
      }
    }`,
    { id },
  );
};

export const restartDeployment = async (id: string): Promise<void> => {
  await gqlRequest(
    `mutation deploymentRestart($id: String!) {
      deploymentRestart(id: $id)
    }`,
    { id },
  );
};

export const removeDeployment = async (id: string): Promise<void> => {
  await gqlRequest(
    `mutation deploymentRemove($id: String!) {
      deploymentRemove(id: $id)
    }`,
    { id },
  );
};

// Same as `railway redeploy --from-source`: pull the latest commit or image instead of reusing the last build
export const deployLatestSource = async (environmentId: string, serviceId: string): Promise<void> => {
  await gqlRequest(
    `mutation serviceInstanceDeploy($environmentId: String!, $serviceId: String!) {
      serviceInstanceDeploy(environmentId: $environmentId, serviceId: $serviceId, latestCommit: true)
    }`,
    { environmentId, serviceId },
  );
};

export type LogType = "deploy" | "build" | "http";

export interface LogGQL {
  timestamp: string;
  message: string;
  severity: string | null;
  attributes: Array<{ key: string; value: string }>;
}

export interface HttpLogGQL {
  timestamp: string;
  requestId: string;
  method: string;
  path: string;
  host: string;
  httpStatus: number;
  totalDuration: number;
  upstreamRqDuration: number;
  srcIp: string;
  clientUa: string;
  edgeRegion: string;
  txBytes: number;
  rxBytes: number;
  upstreamErrors: string;
}

export type LogsResult =
  | { type: "deploy" | "build"; status: DeploymentStatus; logs: LogGQL[] }
  | { type: "http"; status: DeploymentStatus; logs: HttpLogGQL[] };

const logLimit = 500;

const logFields = `
  timestamp
  message
  severity
  attributes {
    key
    value
  }
`;

const fetchDeployLogs = async (deployment: DeploymentGQL): Promise<LogsResult> => {
  const res = await gqlRequest<{ deployment: { status: DeploymentStatus }; deploymentLogs: LogGQL[] }>(
    `query deploymentLogs($deploymentId: String!, $limit: Int) {
      deployment(id: $deploymentId) {
        status
      }
      deploymentLogs(deploymentId: $deploymentId, limit: $limit) {
        ${logFields}
      }
    }`,
    { deploymentId: deployment.id, limit: logLimit },
  );

  // The API returns one more log than requested
  return {
    type: "deploy",
    status: res?.deployment.status ?? deployment.status,
    logs: (res?.deploymentLogs ?? []).slice(-logLimit),
  };
};

// Build logs are scoped the same way as the CLI/dashboard: environment logs tagged with the deployment's snapshot
const fetchBuildLogs = async (deployment: DeploymentGQL): Promise<LogsResult> => {
  if (!deployment.snapshotId) {
    const res = await gqlRequest<{ deployment: { status: DeploymentStatus }; buildLogs: LogGQL[] }>(
      `query buildLogs($deploymentId: String!, $limit: Int) {
        deployment(id: $deploymentId) {
          status
        }
        buildLogs(deploymentId: $deploymentId, limit: $limit) {
          ${logFields}
        }
      }`,
      { deploymentId: deployment.id, limit: logLimit },
    );

    return { type: "build", status: res?.deployment.status ?? deployment.status, logs: res?.buildLogs ?? [] };
  }

  // Build events can be timestamped just before the deployment is created
  const startDate = new Date(new Date(deployment.createdAt).getTime() - 5 * 60 * 1000).toISOString();
  const now = new Date().toISOString();
  const res = await gqlRequest<{ deployment: { status: DeploymentStatus }; environmentLogs: LogGQL[] }>(
    `query buildLogs(
      $deploymentId: String!
      $environmentId: String!
      $filter: String
      $beforeLimit: Int
      $beforeDate: String
      $anchorDate: String
    ) {
      deployment(id: $deploymentId) {
        status
      }
      environmentLogs(
        environmentId: $environmentId
        filter: $filter
        beforeLimit: $beforeLimit
        beforeDate: $beforeDate
        anchorDate: $anchorDate
        afterDate: $anchorDate
        afterLimit: 0
      ) {
        ${logFields}
      }
    }`,
    {
      deploymentId: deployment.id,
      environmentId: deployment.environmentId,
      filter: `(@snapshot:${deployment.snapshotId} OR @replica:${deployment.snapshotId})`,
      beforeLimit: logLimit,
      beforeDate: startDate,
      anchorDate: now,
    },
  );

  // The API can return one more log than requested
  return {
    type: "build",
    status: res?.deployment.status ?? deployment.status,
    logs: (res?.environmentLogs ?? []).slice(-logLimit),
  };
};

const fetchHttpLogs = async (deployment: DeploymentGQL): Promise<LogsResult> => {
  const res = await gqlRequest<{ deployment: { status: DeploymentStatus }; httpLogs: HttpLogGQL[] }>(
    `query httpLogs($deploymentId: String!, $beforeLimit: Int!) {
      deployment(id: $deploymentId) {
        status
      }
      httpLogs(deploymentId: $deploymentId, beforeLimit: $beforeLimit) {
        timestamp
        requestId
        method
        path
        host
        httpStatus
        totalDuration
        upstreamRqDuration
        srcIp
        clientUa
        edgeRegion
        txBytes
        rxBytes
        upstreamErrors
      }
    }`,
    { deploymentId: deployment.id, beforeLimit: logLimit },
  );

  return {
    type: "http",
    status: res?.deployment.status ?? deployment.status,
    logs: (res?.httpLogs ?? []).slice(-logLimit),
  };
};

export const fetchLogs = (type: LogType, deployment: DeploymentGQL): Promise<LogsResult> => {
  switch (type) {
    case "deploy":
      return fetchDeployLogs(deployment);
    case "build":
      return fetchBuildLogs(deployment);
    case "http":
      return fetchHttpLogs(deployment);
  }
};

export interface VariableItem {
  name: string;
  // What the service actually sees, with references like ${{Postgres.DATABASE_URL}} resolved
  value: string | null;
  // The value as written, references unresolved; null for Railway-provided variables
  rawValue: string | null;
  isSealed: boolean;
  isRailwayProvided: boolean;
}

interface ServiceVariablesGQL {
  userVariables: Record<string, string | null>;
  deploymentVariables: Record<string, string | null>;
  environment: {
    variables: {
      edges: Array<{ node: { name: string; serviceId: string | null; isSealed: boolean } }>;
    };
  };
}

// Keys starting with RAILWAY_ are provided by Railway and can't be changed, same as the CLI
export const isRailwayProvidedVariable = (name: string): boolean => name.startsWith("RAILWAY_");

export const fetchVariables = async (
  projectId: string,
  environmentId: string,
  serviceId: string,
): Promise<VariableItem[]> => {
  const res = await gqlRequest<ServiceVariablesGQL>(
    `query serviceVariables($projectId: String!, $environmentId: String!, $serviceId: String!) {
      userVariables: variables(
        projectId: $projectId
        environmentId: $environmentId
        serviceId: $serviceId
        unrendered: true
      )
      deploymentVariables: variablesForServiceDeployment(
        projectId: $projectId
        environmentId: $environmentId
        serviceId: $serviceId
      )
      environment(id: $environmentId, projectId: $projectId) {
        variables(first: 10000) {
          edges {
            node {
              name
              serviceId
              isSealed
            }
          }
        }
      }
    }`,
    { projectId, environmentId, serviceId },
  );
  if (!res) return [];

  const sealed = new Set(
    res.environment.variables.edges
      .map((e) => e.node)
      .filter((v) => v.serviceId === serviceId && v.isSealed)
      .map((v) => v.name),
  );

  const userVariables: VariableItem[] = Object.entries(res.userVariables)
    .filter(([name, rawValue]) => !isRailwayProvidedVariable(name) && (rawValue !== null || sealed.has(name)))
    .map(([name, rawValue]) => ({
      name,
      rawValue,
      value: res.deploymentVariables[name] ?? null,
      isSealed: sealed.has(name),
      isRailwayProvided: false,
    }));

  const railwayVariables: VariableItem[] = Object.entries(res.deploymentVariables)
    .filter(([name, value]) => isRailwayProvidedVariable(name) && value !== null)
    .map(([name, value]) => ({ name, value, rawValue: null, isSealed: false, isRailwayProvided: true }));

  return [...userVariables, ...railwayVariables].sort((a, b) => a.name.localeCompare(b.name));
};

export const upsertVariable = async (
  projectId: string,
  environmentId: string,
  serviceId: string,
  name: string,
  value: string,
  skipDeploys: boolean,
): Promise<void> => {
  await gqlRequest(
    `mutation variableCollectionUpsert($input: VariableCollectionUpsertInput!) {
      variableCollectionUpsert(input: $input)
    }`,
    { input: { projectId, environmentId, serviceId, variables: { [name]: value }, skipDeploys } },
  );
};

export const deleteVariable = async (
  projectId: string,
  environmentId: string,
  serviceId: string,
  name: string,
): Promise<void> => {
  await gqlRequest(
    `mutation variableDelete($input: VariableDeleteInput!) {
      variableDelete(input: $input)
    }`,
    { input: { projectId, environmentId, serviceId, name } },
  );
};

export interface ServiceDomainGQL {
  id: string;
  domain: string;
  targetPort: number | null;
}

export type DnsRecordStatus =
  | "DNS_RECORD_STATUS_PROPAGATED"
  | "DNS_RECORD_STATUS_REQUIRES_UPDATE"
  | "DNS_RECORD_STATUS_UNSPECIFIED"
  | "UNRECOGNIZED";

export type CertificateStatus =
  | "CERTIFICATE_STATUS_TYPE_ISSUE_FAILED"
  | "CERTIFICATE_STATUS_TYPE_ISSUING"
  | "CERTIFICATE_STATUS_TYPE_UNSPECIFIED"
  | "CERTIFICATE_STATUS_TYPE_VALID"
  | "CERTIFICATE_STATUS_TYPE_VALIDATING_OWNERSHIP"
  | "UNRECOGNIZED";

export interface DnsRecordGQL {
  fqdn: string;
  hostlabel: string;
  recordType: string;
  requiredValue: string;
  currentValue: string;
  status: DnsRecordStatus;
}

export interface CustomDomainGQL extends ServiceDomainGQL {
  status: {
    verified: boolean;
    certificateStatus: CertificateStatus;
    certificateErrorMessage: string | null;
    certificateRetryable: boolean | null;
    dnsRecords: DnsRecordGQL[];
  };
}

export interface DomainsGQL {
  serviceDomains: ServiceDomainGQL[];
  customDomains: CustomDomainGQL[];
}

export const fetchDomains = async (
  projectId: string,
  environmentId: string,
  serviceId: string,
): Promise<DomainsGQL> => {
  const res = await gqlRequest<{ domains: DomainsGQL }>(
    `query domains($projectId: String!, $environmentId: String!, $serviceId: String!) {
      domains(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId) {
        serviceDomains {
          id
          domain
          targetPort
        }
        customDomains {
          id
          domain
          targetPort
          status {
            verified
            certificateStatus
            certificateErrorMessage
            certificateRetryable
            dnsRecords {
              fqdn
              hostlabel
              recordType
              requiredValue
              currentValue
              status
            }
          }
        }
      }
    }`,
    { projectId, environmentId, serviceId },
  );

  return res?.domains ?? { serviceDomains: [], customDomains: [] };
};

// Same as `railway domain` without arguments; Railway picks the target port from the deployment
export const createServiceDomain = async (
  environmentId: string,
  serviceId: string,
): Promise<ServiceDomainGQL | null> => {
  const res = await gqlRequest<{ serviceDomainCreate: ServiceDomainGQL }>(
    `mutation serviceDomainCreate($input: ServiceDomainCreateInput!) {
      serviceDomainCreate(input: $input) {
        id
        domain
        targetPort
      }
    }`,
    { input: { environmentId, serviceId } },
  );

  return res?.serviceDomainCreate ?? null;
};

export const retryDomainCertificate = async (customDomainId: string): Promise<void> => {
  await gqlRequest(
    `mutation customDomainIssueCertificate($id: String!) {
      customDomainIssueCertificate(id: $id)
    }`,
    { id: customDomainId },
  );
};

export type MetricMeasurement =
  | "CPU_USAGE"
  | "CPU_LIMIT"
  | "MEMORY_USAGE_GB"
  | "MEMORY_LIMIT_GB"
  | "NETWORK_TX_GB"
  | "NETWORK_RX_GB"
  | "DISK_USAGE_GB";

export interface MetricGQL {
  measurement: MetricMeasurement;
  values: Array<{ ts: number; value: number }>;
}

export type MetricRange = "1h" | "6h" | "1d" | "7d";

// Same windows and sample rates as `railway metrics --since`
export const metricRanges: Record<MetricRange, { title: string; hours: number; sampleRateSeconds: number }> = {
  "1h": { title: "Last Hour", hours: 1, sampleRateSeconds: 30 },
  "6h": { title: "Last 6 Hours", hours: 6, sampleRateSeconds: 60 },
  "1d": { title: "Last Day", hours: 24, sampleRateSeconds: 240 },
  "7d": { title: "Last 7 Days", hours: 168, sampleRateSeconds: 3600 },
};

export const fetchMetrics = async (
  environmentId: string,
  serviceId: string,
  range: MetricRange,
): Promise<MetricGQL[]> => {
  const { hours, sampleRateSeconds } = metricRanges[range];
  const res = await gqlRequest<{ metrics: MetricGQL[] }>(
    `query metrics(
      $environmentId: String
      $serviceId: String
      $startDate: DateTime!
      $measurements: [MetricMeasurement!]!
      $sampleRateSeconds: Int
    ) {
      metrics(
        environmentId: $environmentId
        serviceId: $serviceId
        startDate: $startDate
        measurements: $measurements
        sampleRateSeconds: $sampleRateSeconds
      ) {
        measurement
        values {
          ts
          value
        }
      }
    }`,
    {
      environmentId,
      serviceId,
      startDate: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
      measurements: [
        "CPU_USAGE",
        "CPU_LIMIT",
        "MEMORY_USAGE_GB",
        "MEMORY_LIMIT_GB",
        "NETWORK_TX_GB",
        "NETWORK_RX_GB",
        "DISK_USAGE_GB",
      ],
      sampleRateSeconds,
    },
  );

  return res?.metrics ?? [];
};

const usageMeasurements = ["MEMORY_USAGE_GB", "CPU_USAGE", "NETWORK_TX_GB", "DISK_USAGE_GB", "BACKUP_USAGE_GB"];

// Railway's per-minute prices, as used by `railway usage`
const minutesInMonth = 43_200;
const usagePrices: Record<string, { label: string; price: number }> = {
  CPU_USAGE: { label: "CPU", price: 20 / minutesInMonth },
  MEMORY_USAGE_GB: { label: "Memory", price: 10 / minutesInMonth },
  NETWORK_TX_GB: { label: "Egress", price: 0.05 },
  DISK_USAGE_GB: { label: "Volume", price: 0.15 / minutesInMonth },
  BACKUP_USAGE_GB: { label: "Backup", price: 0.15 / minutesInMonth },
};

const usageCost = (usage: Array<{ measurement: string; value: number }>): number =>
  usage.reduce((total, u) => total + u.value * (usagePrices[u.measurement]?.price ?? 0), 0);

export interface WorkspaceUsage {
  workspace: WorkspaceGQL;
  billingPeriod: { start: string; end: string };
  currentUsage: number;
  estimatedBill: number | null;
  usageLimit: { softLimit: number; hardLimit: number | null; isOverLimit: boolean } | null;
  lineItems: Array<{ label: string; cost: number }>;
  projects: Array<{ id: string; name: string; cost: number; isDeleted: boolean }>;
}

interface WorkspaceUsageContextGQL {
  workspace: WorkspaceGQL & {
    customer: {
      currentUsage: number | null;
      billingPeriod: { start: string; end: string };
      usageLimit: WorkspaceUsage["usageLimit"];
    };
  };
}

interface UsageGQL {
  usage: Array<{ measurement: string; value: number; tags: { projectId: string | null } }>;
  projects: { edges: Array<{ node: { id: string; name: string; deletedAt: string | null } }> };
}

export const fetchWorkspaceUsage = async (workspaceId: string): Promise<WorkspaceUsage | null> => {
  const context = await gqlRequest<WorkspaceUsageContextGQL>(
    `query workspaceUsageContext($workspaceId: String!) {
      workspace(workspaceId: $workspaceId) {
        id
        name
        customer {
          currentUsage
          billingPeriod {
            start
            end
          }
          usageLimit {
            softLimit
            hardLimit
            isOverLimit
          }
        }
      }
    }`,
    { workspaceId },
  );
  if (!context) return null;

  const { customer, ...workspace } = context.workspace;

  const [usage, estimated] = await Promise.all([
    gqlRequest<UsageGQL>(
      `query workspaceUsage(
        $workspaceId: String!
        $measurements: [MetricMeasurement!]!
        $startDate: DateTime!
        $endDate: DateTime!
      ) {
        usage(
          workspaceId: $workspaceId
          measurements: $measurements
          groupBy: [PROJECT_ID]
          startDate: $startDate
          endDate: $endDate
          includeDeleted: true
        ) {
          measurement
          value
          tags {
            projectId
          }
        }
        projects(first: 5000, includeDeleted: true, workspaceId: $workspaceId) {
          edges {
            node {
              id
              name
              deletedAt
            }
          }
        }
      }`,
      {
        workspaceId,
        measurements: usageMeasurements,
        startDate: customer.billingPeriod.start,
        endDate: customer.billingPeriod.end,
      },
    ),
    // The estimate is a nice-to-have, like in the CLI, so a failure here doesn't hide the rest
    gqlRequest<{ estimatedUsage: Array<{ measurement: string; estimatedValue: number }> }>(
      `query workspaceEstimatedUsage($workspaceId: String!, $measurements: [MetricMeasurement!]!) {
        estimatedUsage(workspaceId: $workspaceId, measurements: $measurements, includeDeleted: true) {
          measurement
          estimatedValue
        }
      }`,
      { workspaceId, measurements: usageMeasurements },
    ).catch(() => null),
  ]);

  const samples = usage?.usage ?? [];
  const metricsCost = usageCost(samples);
  const currentUsage = customer.currentUsage ?? metricsCost;
  const estimatedBill = estimated
    ? usageCost(estimated.estimatedUsage.map((u) => ({ measurement: u.measurement, value: u.estimatedValue }))) +
      Math.max(currentUsage - metricsCost, 0)
    : null;

  const lineItems = Object.entries(usagePrices)
    .map(([measurement, { label }]) => ({
      label,
      cost: usageCost(samples.filter((u) => u.measurement === measurement)),
    }))
    .filter((item) => item.cost > 0);

  const projects = (usage?.projects.edges ?? [])
    .map(({ node }) => ({
      id: node.id,
      name: node.name,
      isDeleted: Boolean(node.deletedAt),
      cost: usageCost(samples.filter((u) => u.tags.projectId === node.id)),
    }))
    .filter((p) => p.cost > 0)
    .sort((a, b) => b.cost - a.cost);

  return {
    workspace,
    billingPeriod: customer.billingPeriod,
    currentUsage,
    estimatedBill,
    usageLimit: customer.usageLimit,
    lineItems,
    projects,
  };
};

export interface WorkspaceTemplateGQL {
  id: string;
  code: string;
  name: string;
  description: string | null;
  image: string | null;
  category: string | null;
  readme: string | null;
  status: "HIDDEN" | "PUBLISHED" | "UNPUBLISHED";
}

export const fetchWorkspaceTemplates = async (
  workspaceId: string,
  after?: string,
): Promise<{ templates: WorkspaceTemplateGQL[]; hasNextPage: boolean; endCursor: string | null }> => {
  const res = await gqlRequest<{
    workspaceTemplates: {
      edges: Array<{ node: WorkspaceTemplateGQL }>;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  }>(
    `query workspaceTemplates($workspaceId: String!, $first: Int, $after: String) {
      workspaceTemplates(workspaceId: $workspaceId, first: $first, after: $after) {
        edges {
          node {
            id
            code
            name
            description
            image
            category
            readme
            status
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }`,
    { workspaceId, first: 50, after },
  );

  return {
    templates: res?.workspaceTemplates.edges.map((e) => e.node) ?? [],
    hasNextPage: res?.workspaceTemplates.pageInfo.hasNextPage ?? false,
    endCursor: res?.workspaceTemplates.pageInfo.endCursor ?? null,
  };
};

export interface RecentDeployment {
  deployment: DeploymentGQL;
  project: { id: string; name: string };
  environment: { id: string; name: string };
  service: { id: string; name: string };
}

interface RecentServiceInstancesGQL {
  serviceInstances: {
    edges: Array<{ node: { serviceId: string; serviceName: string; latestDeployment: DeploymentGQL | null } }>;
  };
}

const recentServiceInstancesFields = `
  serviceInstances {
    edges {
      node {
        serviceId
        serviceName
        latestDeployment {
          ${deploymentFields}
        }
      }
    }
  }
`;

const toRecentDeployments = (
  project: { id: string; name: string },
  environment: { id: string; name: string } & RecentServiceInstancesGQL,
): RecentDeployment[] =>
  environment.serviceInstances.edges.flatMap(({ node }) =>
    node.latestDeployment
      ? [
          {
            deployment: node.latestDeployment,
            project,
            environment: { id: environment.id, name: environment.name },
            service: { id: node.serviceId, name: node.serviceName },
          },
        ]
      : [],
  );

// All projects are aliased into a single request to keep the menu bar's background refresh cheap
const fetchRecentForProjects = async (projectIds: string[]): Promise<RecentDeployment[]> => {
  const variables = Object.fromEntries(projectIds.map((id, index) => [`p${index}`, id]));
  const res = await gqlRequest<
    Record<
      string,
      {
        id: string;
        name: string;
        environments: {
          edges: Array<{ node: { id: string; name: string; canAccess: boolean } & RecentServiceInstancesGQL }>;
        };
      }
    >
  >(
    `query recentDeployments(${projectIds.map((_, index) => `$p${index}: String!`).join(", ")}) {
      ${projectIds
        .map(
          (_, index) => `p${index}: project(id: $p${index}) {
            id
            name
            environments {
              edges {
                node {
                  id
                  name
                  canAccess
                  ${recentServiceInstancesFields}
                }
              }
            }
          }`,
        )
        .join("\n")}
    }`,
    variables,
  );

  return Object.values(res ?? {}).flatMap((project) =>
    project.environments.edges
      .filter((e) => e.node.canAccess)
      .flatMap((e) => toRecentDeployments({ id: project.id, name: project.name }, e.node)),
  );
};

// The latest deployment of every service in the given projects, newest first
export const fetchRecentDeployments = async (projectIds: string[]): Promise<RecentDeployment[]> => {
  if (projectIds.length === 0) return [];

  let recent: RecentDeployment[];
  if (isProjectToken()) {
    // A project token can only read its own environment
    const res = await gqlRequest<{
      projectToken: {
        project: { id: string; name: string };
        environment: { id: string; name: string } & RecentServiceInstancesGQL;
      };
    }>(`query recentDeployments {
      projectToken {
        project {
          id
          name
        }
        environment {
          id
          name
          ${recentServiceInstancesFields}
        }
      }
    }`);
    recent = res ? toRecentDeployments(res.projectToken.project, res.projectToken.environment) : [];
  } else {
    try {
      recent = await fetchRecentForProjects(projectIds);
    } catch (error) {
      // One project that can't be read fails the whole batch, so retry them one by one and keep the rest
      if (projectIds.length === 1) throw error;
      const results = await Promise.allSettled(projectIds.map((id) => fetchRecentForProjects([id])));
      const fulfilled = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
      if (fulfilled.length === 0) throw error;
      recent = fulfilled.flat();
    }
  }

  return recent.sort((a, b) => new Date(b.deployment.createdAt).getTime() - new Date(a.deployment.createdAt).getTime());
};
