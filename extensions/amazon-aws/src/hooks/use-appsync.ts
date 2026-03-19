import {
  GraphqlApi,
  DataSource,
  Resolver,
  ApiKey,
  ListGraphqlApisCommand,
  ListDataSourcesCommand,
  ListResolversCommand,
  ListApiKeysCommand,
  GetGraphqlApiCommand,
  GetIntrospectionSchemaCommand,
  ListFunctionsCommand,
  FunctionConfiguration,
} from "@aws-sdk/client-appsync";
import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { isReadyToFetch } from "../util";
import { getAppSyncClient } from "../services/clients/appsync";

/**
 * Hook to fetch and manage AppSync GraphQL APIs
 */
export function useAppSyncAPIs() {
  const {
    data: apis,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading GraphQL APIs" });
      return await fetchAppSyncAPIs(toast);
    },
    [],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌ Failed to load GraphQL APIs" } },
  );

  return { apis, error, isLoading: (!apis && !error) || isLoading, revalidate };
}

async function fetchAppSyncAPIs(toast: Toast, maxResults = 100): Promise<GraphqlApi[]> {
  const client = getAppSyncClient();
  const apis: GraphqlApi[] = [];
  let nextToken: string | undefined;

  do {
    const { graphqlApis, nextToken: cursor } = await client.send(new ListGraphqlApisCommand({ nextToken }));

    if (graphqlApis) {
      apis.push(...graphqlApis);
    }

    toast.message = `${apis.length} APIs`;
    nextToken = cursor;
  } while (nextToken && apis.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded GraphQL APIs";
  toast.message = `${apis.length} APIs`;
  return apis;
}

/**
 * Hook to fetch data sources for a specific AppSync API
 */
export function useAppSyncDataSources(apiId: string) {
  const {
    data: dataSources,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (id: string) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading data sources" });
      return await fetchAppSyncDataSources(id, toast);
    },
    [apiId],
    { execute: isReadyToFetch() && !!apiId, failureToastOptions: { title: "❌ Failed to load data sources" } },
  );

  return { dataSources, error, isLoading: (!dataSources && !error) || isLoading, revalidate };
}

async function fetchAppSyncDataSources(apiId: string, toast: Toast, maxResults = 100): Promise<DataSource[]> {
  const client = getAppSyncClient();
  const dataSources: DataSource[] = [];
  let nextToken: string | undefined;

  do {
    const { dataSources: dataSourceList, nextToken: cursor } = await client.send(
      new ListDataSourcesCommand({ apiId, nextToken }),
    );

    if (dataSourceList) {
      dataSources.push(...dataSourceList);
    }

    toast.message = `${dataSources.length} data sources`;
    nextToken = cursor;
  } while (nextToken && dataSources.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded data sources";
  toast.message = `${dataSources.length} data sources`;
  return dataSources;
}

/**
 * Hook to fetch resolvers for a specific AppSync API
 * Since typeName is required, we fetch common types (Query, Mutation, Subscription)
 */
export function useAppSyncResolvers(apiId: string) {
  const {
    data: resolvers,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (id: string) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading resolvers" });
      return await fetchAllResolvers(id, toast);
    },
    [apiId],
    { execute: isReadyToFetch() && !!apiId, failureToastOptions: { title: "❌ Failed to load resolvers" } },
  );

  return { resolvers, error, isLoading: (!resolvers && !error) || isLoading, revalidate };
}

async function fetchAllResolvers(apiId: string, toast: Toast): Promise<Resolver[]> {
  const allResolvers: Resolver[] = [];

  // Common GraphQL types that typically have resolvers
  const commonTypes = ["Query", "Mutation", "Subscription"];

  for (const typeName of commonTypes) {
    try {
      const resolversForType = await fetchResolversForType(apiId, typeName, toast);
      allResolvers.push(...resolversForType);
    } catch {
      // Type might not exist in this API, continue with other types
    }
  }

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded resolvers";
  toast.message = `${allResolvers.length} resolvers`;
  return allResolvers;
}

async function fetchResolversForType(
  apiId: string,
  typeName: string,
  toast: Toast,
  maxResults = 100,
): Promise<Resolver[]> {
  const client = getAppSyncClient();
  const resolvers: Resolver[] = [];
  let nextToken: string | undefined;

  do {
    const { resolvers: resolverList, nextToken: cursor } = await client.send(
      new ListResolversCommand({
        apiId,
        typeName,
        nextToken,
        maxResults: Math.min(maxResults - resolvers.length, 25),
      }),
    );

    if (resolverList) {
      resolvers.push(...resolverList);
    }

    toast.message = `Loading ${typeName} resolvers... ${resolvers.length} found`;
    nextToken = cursor;
  } while (nextToken && resolvers.length < maxResults);

  return resolvers;
}

/**
 * Hook to fetch API keys for a specific AppSync API
 */
export function useAppSyncApiKeys(apiId: string) {
  const {
    data: apiKeys,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (id: string) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading API keys" });
      return await fetchAppSyncApiKeys(id, toast);
    },
    [apiId],
    { execute: isReadyToFetch() && !!apiId, failureToastOptions: { title: "❌ Failed to load API keys" } },
  );

  return { apiKeys, error, isLoading: (!apiKeys && !error) || isLoading, revalidate };
}

async function fetchAppSyncApiKeys(apiId: string, toast: Toast, maxResults = 100): Promise<ApiKey[]> {
  const client = getAppSyncClient();
  const apiKeys: ApiKey[] = [];
  let nextToken: string | undefined;

  do {
    const { apiKeys: apiKeyList, nextToken: cursor } = await client.send(new ListApiKeysCommand({ apiId, nextToken }));

    if (apiKeyList) {
      apiKeys.push(...apiKeyList);
    }

    toast.message = `${apiKeys.length} API keys`;
    nextToken = cursor;
  } while (nextToken && apiKeys.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded API keys";
  toast.message = `${apiKeys.length} API keys`;
  return apiKeys;
}

/**
 * Hook to fetch details for a specific AppSync API
 */
export function useAppSyncApiDetails(apiId: string) {
  const {
    data: api,
    error,
    isLoading,
  } = useCachedPromise(
    async (id: string) => {
      const client = getAppSyncClient();
      const { graphqlApi } = await client.send(new GetGraphqlApiCommand({ apiId: id }));
      return graphqlApi;
    },
    [apiId],
    { execute: isReadyToFetch() && !!apiId, failureToastOptions: { title: "❌ Failed to load API details" } },
  );

  return { api, error, isLoading: (!api && !error) || isLoading };
}

/**
 * Hook to fetch the GraphQL schema for a specific AppSync API
 */
export function useAppSyncSchema(apiId: string, format: "SDL" | "JSON" = "SDL") {
  const {
    data: schema,
    error,
    isLoading,
  } = useCachedPromise(
    async (id: string, schemaFormat: "SDL" | "JSON") => {
      const client = getAppSyncClient();
      const { schema } = await client.send(new GetIntrospectionSchemaCommand({ apiId: id, format: schemaFormat }));
      return schema;
    },
    [apiId, format],
    { execute: isReadyToFetch() && !!apiId, failureToastOptions: { title: "❌ Failed to load schema" } },
  );

  return { schema, error, isLoading: (!schema && !error) || isLoading };
}

/**
 * Hook to fetch AppSync functions for a specific API
 */
export function useAppSyncFunctions(apiId: string) {
  const {
    data: functions,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (id: string) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading functions" });
      return await fetchAppSyncFunctions(id, toast);
    },
    [apiId],
    { execute: isReadyToFetch() && !!apiId, failureToastOptions: { title: "❌ Failed to load functions" } },
  );

  return { functions, error, isLoading: (!functions && !error) || isLoading, revalidate };
}

async function fetchAppSyncFunctions(apiId: string, toast: Toast, maxResults = 100): Promise<FunctionConfiguration[]> {
  const client = getAppSyncClient();
  const functions: FunctionConfiguration[] = [];
  let nextToken: string | undefined;

  do {
    const { functions: functionList, nextToken: cursor } = await client.send(
      new ListFunctionsCommand({ apiId, nextToken }),
    );

    if (functionList) {
      functions.push(...functionList);
    }

    toast.message = `${functions.length} functions`;
    nextToken = cursor;
  } while (nextToken && functions.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded functions";
  toast.message = `${functions.length} functions`;
  return functions;
}
