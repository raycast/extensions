import {
  RestApi,
  GetRestApisCommand,
  GetResourcesCommand,
  Resource,
  GetStagesCommand,
  Stage,
  GetApiKeysCommand,
  ApiKey,
  GetUsagePlansCommand,
  UsagePlan,
  GetMethodCommand,
  GetDeploymentsCommand,
  Deployment,
  GetAuthorizersCommand,
  Authorizer,
  GetDomainNamesCommand,
  DomainName,
  GetBasePathMappingsCommand,
  BasePathMapping,
} from "@aws-sdk/client-api-gateway";
import {
  GetApisCommand,
  Api,
  GetStagesCommand as GetStagesV2Command,
  Stage as StageV2,
  GetRoutesCommand,
  Route,
} from "@aws-sdk/client-apigatewayv2";
import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { isReadyToFetch } from "../util";
import { getApiGatewayClient, getApiGatewayV2Client } from "../services/clients/api-gateway";

/**
 * Hook to fetch and manage API Gateway REST APIs
 */
export function useApiGatewayAPIs() {
  const {
    data: apis,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading REST APIs" });
      return await fetchApiGatewayAPIs(toast);
    },
    [],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌ Failed to load REST APIs" } },
  );

  return { apis, error, isLoading: (!apis && !error) || isLoading, revalidate };
}

async function fetchApiGatewayAPIs(toast: Toast, maxResults = 500): Promise<RestApi[]> {
  const client = getApiGatewayClient();
  const apis: RestApi[] = [];
  let position: string | undefined;

  do {
    const { items, position: nextPosition } = await client.send(
      new GetRestApisCommand({ position, limit: Math.min(maxResults - apis.length, 500) }),
    );

    if (items) {
      apis.push(...items);
    }

    toast.message = `${apis.length} APIs`;
    position = nextPosition;
  } while (position && apis.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded REST APIs";
  toast.message = `${apis.length} APIs`;
  return apis;
}

/**
 * Hook to fetch resources for a specific API Gateway REST API
 */
export function useApiGatewayResources(apiId: string) {
  const {
    data: resources,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (id: string) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading resources" });
      return await fetchApiGatewayResources(id, toast);
    },
    [apiId],
    { execute: isReadyToFetch() && !!apiId, failureToastOptions: { title: "❌ Failed to load resources" } },
  );

  return { resources, error, isLoading: (!resources && !error) || isLoading, revalidate };
}

async function fetchApiGatewayResources(apiId: string, toast: Toast, maxResults = 500): Promise<Resource[]> {
  const client = getApiGatewayClient();
  const resources: Resource[] = [];
  let position: string | undefined;

  do {
    const { items, position: nextPosition } = await client.send(
      new GetResourcesCommand({ restApiId: apiId, position, limit: Math.min(maxResults - resources.length, 500) }),
    );

    if (items) {
      resources.push(...items);
    }

    toast.message = `${resources.length} resources`;
    position = nextPosition;
  } while (position && resources.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded resources";
  toast.message = `${resources.length} resources`;
  return resources;
}

/**
 * Hook to fetch stages for a specific API Gateway REST API
 */
export function useApiGatewayStages(apiId: string) {
  const {
    data: stages,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (id: string) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading stages" });
      return await fetchApiGatewayStages(id, toast);
    },
    [apiId],
    { execute: isReadyToFetch() && !!apiId, failureToastOptions: { title: "❌ Failed to load stages" } },
  );

  return { stages, error, isLoading: (!stages && !error) || isLoading, revalidate };
}

async function fetchApiGatewayStages(apiId: string, toast: Toast): Promise<Stage[]> {
  const client = getApiGatewayClient();
  const { item: stages } = await client.send(new GetStagesCommand({ restApiId: apiId }));

  const filteredStages = stages ?? [];

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded stages";
  toast.message = `${filteredStages.length} stages`;
  return filteredStages;
}

/**
 * Hook to fetch API keys
 */
export function useApiGatewayApiKeys() {
  const {
    data: apiKeys,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading API keys" });
      return await fetchApiGatewayApiKeys(toast);
    },
    [],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌ Failed to load API keys" } },
  );

  return { apiKeys, error, isLoading: (!apiKeys && !error) || isLoading, revalidate };
}

async function fetchApiGatewayApiKeys(toast: Toast, maxResults = 500): Promise<ApiKey[]> {
  const client = getApiGatewayClient();
  const apiKeys: ApiKey[] = [];
  let position: string | undefined;

  do {
    const { items, position: nextPosition } = await client.send(
      new GetApiKeysCommand({ position, limit: Math.min(maxResults - apiKeys.length, 500) }),
    );

    if (items) {
      apiKeys.push(...items);
    }

    toast.message = `${apiKeys.length} API keys`;
    position = nextPosition;
  } while (position && apiKeys.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded API keys";
  toast.message = `${apiKeys.length} API keys`;
  return apiKeys;
}

/**
 * Hook to fetch usage plans
 */
export function useApiGatewayUsagePlans() {
  const {
    data: usagePlans,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading usage plans" });
      return await fetchApiGatewayUsagePlans(toast);
    },
    [],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌ Failed to load usage plans" } },
  );

  return { usagePlans, error, isLoading: (!usagePlans && !error) || isLoading, revalidate };
}

async function fetchApiGatewayUsagePlans(toast: Toast, maxResults = 500): Promise<UsagePlan[]> {
  const client = getApiGatewayClient();
  const usagePlans: UsagePlan[] = [];
  let position: string | undefined;

  do {
    const { items, position: nextPosition } = await client.send(
      new GetUsagePlansCommand({ position, limit: Math.min(maxResults - usagePlans.length, 500) }),
    );

    if (items) {
      usagePlans.push(...items);
    }

    toast.message = `${usagePlans.length} usage plans`;
    position = nextPosition;
  } while (position && usagePlans.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded usage plans";
  toast.message = `${usagePlans.length} usage plans`;
  return usagePlans;
}

/**
 * Hook to fetch a method for a specific resource
 */
export function useApiGatewayMethod(apiId: string, resourceId: string, httpMethod: string) {
  const {
    data: method,
    error,
    isLoading,
  } = useCachedPromise(
    async (restApiId: string, resId: string, method: string) => {
      const client = getApiGatewayClient();
      const response = await client.send(
        new GetMethodCommand({
          restApiId,
          resourceId: resId,
          httpMethod: method,
        }),
      );
      return response;
    },
    [apiId, resourceId, httpMethod],
    {
      execute: isReadyToFetch() && !!apiId && !!resourceId && !!httpMethod,
      failureToastOptions: { title: "❌ Failed to load method" },
    },
  );

  return { method, error, isLoading: (!method && !error) || isLoading };
}

/**
 * Hook to fetch HTTP APIs (API Gateway v2)
 */
export function useHttpAPIs() {
  const {
    data: apis,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading HTTP APIs" });
      return await fetchHttpAPIs(toast);
    },
    [],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌ Failed to load HTTP APIs" } },
  );

  return { apis, error, isLoading: (!apis && !error) || isLoading, revalidate };
}

async function fetchHttpAPIs(toast: Toast, maxResults = 500): Promise<Api[]> {
  const client = getApiGatewayV2Client();
  const apis: Api[] = [];
  let nextToken: string | undefined;

  do {
    const { Items, NextToken } = await client.send(
      new GetApisCommand({ NextToken: nextToken, MaxResults: String(Math.min(maxResults - apis.length, 100)) }),
    );

    if (Items) {
      apis.push(...Items);
    }

    toast.message = `${apis.length} HTTP APIs`;
    nextToken = NextToken;
  } while (nextToken && apis.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded HTTP APIs";
  toast.message = `${apis.length} HTTP APIs`;
  return apis;
}

/**
 * Hook to fetch deployments for a REST API
 */
export function useApiGatewayDeployments(apiId: string) {
  const {
    data: deployments,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (id: string) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading deployments" });
      return await fetchApiGatewayDeployments(id, toast);
    },
    [apiId],
    { execute: isReadyToFetch() && !!apiId, failureToastOptions: { title: "❌ Failed to load deployments" } },
  );

  return { deployments, error, isLoading: (!deployments && !error) || isLoading, revalidate };
}

async function fetchApiGatewayDeployments(apiId: string, toast: Toast, maxResults = 500): Promise<Deployment[]> {
  const client = getApiGatewayClient();
  const deployments: Deployment[] = [];
  let position: string | undefined;

  do {
    const { items, position: nextPosition } = await client.send(
      new GetDeploymentsCommand({ restApiId: apiId, position, limit: Math.min(maxResults - deployments.length, 500) }),
    );

    if (items) {
      deployments.push(...items);
    }

    toast.message = `${deployments.length} deployments`;
    position = nextPosition;
  } while (position && deployments.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded deployments";
  toast.message = `${deployments.length} deployments`;
  return deployments;
}

/**
 * Hook to fetch routes for an HTTP API
 */
export function useHttpApiRoutes(apiId: string) {
  const {
    data: routes,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (id: string) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading routes" });
      return await fetchHttpApiRoutes(id, toast);
    },
    [apiId],
    { execute: isReadyToFetch() && !!apiId, failureToastOptions: { title: "❌ Failed to load routes" } },
  );

  return { routes, error, isLoading: (!routes && !error) || isLoading, revalidate };
}

async function fetchHttpApiRoutes(apiId: string, toast: Toast, maxResults = 500): Promise<Route[]> {
  const client = getApiGatewayV2Client();
  const routes: Route[] = [];
  let nextToken: string | undefined;

  do {
    const { Items, NextToken } = await client.send(
      new GetRoutesCommand({
        ApiId: apiId,
        NextToken: nextToken,
        MaxResults: String(Math.min(maxResults - routes.length, 100)),
      }),
    );

    if (Items) {
      routes.push(...Items);
    }

    toast.message = `${routes.length} routes`;
    nextToken = NextToken;
  } while (nextToken && routes.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded routes";
  toast.message = `${routes.length} routes`;
  return routes;
}

/**
 * Hook to fetch stages for an HTTP API
 */
export function useHttpApiStages(apiId: string) {
  const {
    data: stages,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (id: string) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading stages" });
      return await fetchHttpApiStages(id, toast);
    },
    [apiId],
    { execute: isReadyToFetch() && !!apiId, failureToastOptions: { title: "❌ Failed to load stages" } },
  );

  return { stages, error, isLoading: (!stages && !error) || isLoading, revalidate };
}

async function fetchHttpApiStages(apiId: string, toast: Toast, maxResults = 500): Promise<StageV2[]> {
  const client = getApiGatewayV2Client();
  const stages: StageV2[] = [];
  let nextToken: string | undefined;

  do {
    const { Items, NextToken } = await client.send(
      new GetStagesV2Command({
        ApiId: apiId,
        NextToken: nextToken,
        MaxResults: String(Math.min(maxResults - stages.length, 100)),
      }),
    );

    if (Items) {
      stages.push(...Items);
    }

    toast.message = `${stages.length} stages`;
    nextToken = NextToken;
  } while (nextToken && stages.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded stages";
  toast.message = `${stages.length} stages`;
  return stages;
}

/**
 * Hook to fetch authorizers for a specific API Gateway REST API
 */
export function useApiGatewayAuthorizers(apiId: string) {
  const {
    data: authorizers,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (id: string) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading authorizers" });
      return await fetchApiGatewayAuthorizers(id, toast);
    },
    [apiId],
    { execute: isReadyToFetch() && !!apiId, failureToastOptions: { title: "❌ Failed to load authorizers" } },
  );

  return { authorizers, error, isLoading: (!authorizers && !error) || isLoading, revalidate };
}

async function fetchApiGatewayAuthorizers(apiId: string, toast: Toast, maxResults = 500): Promise<Authorizer[]> {
  const client = getApiGatewayClient();
  const authorizers: Authorizer[] = [];
  let position: string | undefined;

  do {
    const { items, position: nextPosition } = await client.send(
      new GetAuthorizersCommand({
        restApiId: apiId,
        position,
        limit: Math.min(maxResults - authorizers.length, 500),
      }),
    );

    if (items) {
      authorizers.push(...items);
    }

    toast.message = `${authorizers.length} authorizers`;
    position = nextPosition;
  } while (position && authorizers.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded authorizers";
  toast.message = `${authorizers.length} authorizers`;
  return authorizers;
}

/**
 * Hook to fetch custom domain names for API Gateway
 */
export function useApiGatewayDomainNames() {
  const {
    data: domainNames,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading domain names" });
      return await fetchApiGatewayDomainNames(toast);
    },
    [],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌ Failed to load domain names" } },
  );

  return { domainNames, error, isLoading: (!domainNames && !error) || isLoading, revalidate };
}

async function fetchApiGatewayDomainNames(toast: Toast, maxResults = 500): Promise<DomainName[]> {
  const client = getApiGatewayClient();
  const domainNames: DomainName[] = [];
  let position: string | undefined;

  do {
    const { items, position: nextPosition } = await client.send(
      new GetDomainNamesCommand({ position, limit: Math.min(maxResults - domainNames.length, 500) }),
    );

    if (items) {
      domainNames.push(...items);
    }

    toast.message = `${domainNames.length} domain names`;
    position = nextPosition;
  } while (position && domainNames.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded domain names";
  toast.message = `${domainNames.length} domain names`;
  return domainNames;
}

/**
 * Hook to fetch base path mappings for a custom domain
 */
export function useApiGatewayBasePathMappings(domainName: string) {
  const {
    data: basePathMappings,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (domain: string) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading base path mappings" });
      return await fetchApiGatewayBasePathMappings(domain, toast);
    },
    [domainName],
    {
      execute: isReadyToFetch() && !!domainName,
      failureToastOptions: { title: "❌ Failed to load base path mappings" },
    },
  );

  return { basePathMappings, error, isLoading: (!basePathMappings && !error) || isLoading, revalidate };
}

async function fetchApiGatewayBasePathMappings(
  domainName: string,
  toast: Toast,
  maxResults = 500,
): Promise<BasePathMapping[]> {
  const client = getApiGatewayClient();
  const mappings: BasePathMapping[] = [];
  let position: string | undefined;

  do {
    const { items, position: nextPosition } = await client.send(
      new GetBasePathMappingsCommand({ domainName, position, limit: Math.min(maxResults - mappings.length, 500) }),
    );

    if (items) {
      mappings.push(...items);
    }

    toast.message = `${mappings.length} mappings`;
    position = nextPosition;
  } while (position && mappings.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded base path mappings";
  toast.message = `${mappings.length} mappings`;
  return mappings;
}
