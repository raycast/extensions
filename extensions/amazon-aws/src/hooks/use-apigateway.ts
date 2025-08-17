import {
  APIGatewayClient,
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
} from "@aws-sdk/client-api-gateway";
import {
  ApiGatewayV2Client,
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

async function fetchApiGatewayAPIs(toast: Toast, position?: string, aggregate?: RestApi[]): Promise<RestApi[]> {
  const client = new APIGatewayClient({});
  const { items, position: nextPosition } = await client.send(new GetRestApisCommand({ position, limit: 500 }));

  const filteredApis = items ?? [];
  const agg = [...(aggregate ?? []), ...filteredApis];

  toast.message = `${agg.length} APIs`;

  if (nextPosition) {
    return await fetchApiGatewayAPIs(toast, nextPosition, agg);
  }

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded REST APIs";
  toast.message = `${agg.length} APIs`;
  return agg;
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

async function fetchApiGatewayResources(
  apiId: string,
  toast: Toast,
  position?: string,
  aggregate?: Resource[],
): Promise<Resource[]> {
  const client = new APIGatewayClient({});
  const { items, position: nextPosition } = await client.send(
    new GetResourcesCommand({ restApiId: apiId, position, limit: 500 }),
  );

  const filteredResources = items ?? [];
  const agg = [...(aggregate ?? []), ...filteredResources];

  toast.message = `${agg.length} resources`;

  if (nextPosition) {
    return await fetchApiGatewayResources(apiId, toast, nextPosition, agg);
  }

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded resources";
  toast.message = `${agg.length} resources`;
  return agg;
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
  const client = new APIGatewayClient({});
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

async function fetchApiGatewayApiKeys(toast: Toast, position?: string, aggregate?: ApiKey[]): Promise<ApiKey[]> {
  const client = new APIGatewayClient({});
  const { items, position: nextPosition } = await client.send(new GetApiKeysCommand({ position, limit: 500 }));

  const filteredApiKeys = items ?? [];
  const agg = [...(aggregate ?? []), ...filteredApiKeys];

  toast.message = `${agg.length} API keys`;

  if (nextPosition) {
    return await fetchApiGatewayApiKeys(toast, nextPosition, agg);
  }

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded API keys";
  toast.message = `${agg.length} API keys`;
  return agg;
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

async function fetchApiGatewayUsagePlans(
  toast: Toast,
  position?: string,
  aggregate?: UsagePlan[],
): Promise<UsagePlan[]> {
  const client = new APIGatewayClient({});
  const { items, position: nextPosition } = await client.send(new GetUsagePlansCommand({ position, limit: 500 }));

  const filteredUsagePlans = items ?? [];
  const agg = [...(aggregate ?? []), ...filteredUsagePlans];

  toast.message = `${agg.length} usage plans`;

  if (nextPosition) {
    return await fetchApiGatewayUsagePlans(toast, nextPosition, agg);
  }

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded usage plans";
  toast.message = `${agg.length} usage plans`;
  return agg;
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
      const client = new APIGatewayClient({});
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

async function fetchHttpAPIs(toast: Toast, nextToken?: string, aggregate?: Api[]): Promise<Api[]> {
  const client = new ApiGatewayV2Client({});
  const { Items, NextToken } = await client.send(new GetApisCommand({ NextToken: nextToken, MaxResults: "100" }));

  const filteredApis = Items ?? [];
  const agg = [...(aggregate ?? []), ...filteredApis];

  toast.message = `${agg.length} HTTP APIs`;

  if (NextToken) {
    return await fetchHttpAPIs(toast, NextToken, agg);
  }

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded HTTP APIs";
  toast.message = `${agg.length} HTTP APIs`;
  return agg;
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

async function fetchApiGatewayDeployments(
  apiId: string,
  toast: Toast,
  position?: string,
  aggregate?: Deployment[],
): Promise<Deployment[]> {
  const client = new APIGatewayClient({});
  const { items, position: nextPosition } = await client.send(
    new GetDeploymentsCommand({ restApiId: apiId, position, limit: 500 }),
  );

  const filteredDeployments = items ?? [];
  const agg = [...(aggregate ?? []), ...filteredDeployments];

  toast.message = `${agg.length} deployments`;

  if (nextPosition) {
    return await fetchApiGatewayDeployments(apiId, toast, nextPosition, agg);
  }

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded deployments";
  toast.message = `${agg.length} deployments`;
  return agg;
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

async function fetchHttpApiRoutes(
  apiId: string,
  toast: Toast,
  nextToken?: string,
  aggregate?: Route[],
): Promise<Route[]> {
  const client = new ApiGatewayV2Client({});
  const { Items, NextToken } = await client.send(
    new GetRoutesCommand({ ApiId: apiId, NextToken: nextToken, MaxResults: "100" }),
  );

  const filteredRoutes = Items ?? [];
  const agg = [...(aggregate ?? []), ...filteredRoutes];

  toast.message = `${agg.length} routes`;

  if (NextToken) {
    return await fetchHttpApiRoutes(apiId, toast, NextToken, agg);
  }

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded routes";
  toast.message = `${agg.length} routes`;
  return agg;
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

async function fetchHttpApiStages(
  apiId: string,
  toast: Toast,
  nextToken?: string,
  aggregate?: StageV2[],
): Promise<StageV2[]> {
  const client = new ApiGatewayV2Client({});
  const { Items, NextToken } = await client.send(
    new GetStagesV2Command({ ApiId: apiId, NextToken: nextToken, MaxResults: "100" }),
  );

  const filteredStages = Items ?? [];
  const agg = [...(aggregate ?? []), ...filteredStages];

  toast.message = `${agg.length} stages`;

  if (NextToken) {
    return await fetchHttpApiStages(apiId, toast, NextToken, agg);
  }

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded stages";
  toast.message = `${agg.length} stages`;
  return agg;
}
