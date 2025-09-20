import {
  AppSyncClient,
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

async function fetchAppSyncAPIs(toast: Toast, nextToken?: string, aggregate?: GraphqlApi[]): Promise<GraphqlApi[]> {
  const client = new AppSyncClient({});
  const { graphqlApis, nextToken: cursor } = await client.send(new ListGraphqlApisCommand({ nextToken }));

  const filteredApis = graphqlApis ?? [];
  const agg = [...(aggregate ?? []), ...filteredApis];

  toast.message = `${agg.length} APIs`;

  if (cursor) {
    return await fetchAppSyncAPIs(toast, cursor, agg);
  }

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded GraphQL APIs";
  toast.message = `${agg.length} APIs`;
  return agg;
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

async function fetchAppSyncDataSources(
  apiId: string,
  toast: Toast,
  nextToken?: string,
  aggregate?: DataSource[],
): Promise<DataSource[]> {
  const client = new AppSyncClient({});
  const { dataSources, nextToken: cursor } = await client.send(new ListDataSourcesCommand({ apiId, nextToken }));

  const filteredDataSources = dataSources ?? [];
  const agg = [...(aggregate ?? []), ...filteredDataSources];

  toast.message = `${agg.length} data sources`;

  if (cursor) {
    return await fetchAppSyncDataSources(apiId, toast, cursor, agg);
  }

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded data sources";
  toast.message = `${agg.length} data sources`;
  return agg;
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
    } catch (error) {
      // Type might not exist, continue with others
      console.log(`No ${typeName} type found`);
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
  nextToken?: string,
  aggregate?: Resolver[],
): Promise<Resolver[]> {
  const client = new AppSyncClient({});

  const { resolvers, nextToken: cursor } = await client.send(
    new ListResolversCommand({
      apiId,
      typeName,
      nextToken,
      maxResults: 25,
    }),
  );

  const filteredResolvers = resolvers ?? [];
  const agg = [...(aggregate ?? []), ...filteredResolvers];

  toast.message = `Loading ${typeName} resolvers... ${agg.length} found`;

  if (cursor) {
    return await fetchResolversForType(apiId, typeName, toast, cursor, agg);
  }

  return agg;
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

async function fetchAppSyncApiKeys(
  apiId: string,
  toast: Toast,
  nextToken?: string,
  aggregate?: ApiKey[],
): Promise<ApiKey[]> {
  const client = new AppSyncClient({});
  const { apiKeys, nextToken: cursor } = await client.send(new ListApiKeysCommand({ apiId, nextToken }));

  const filteredApiKeys = apiKeys ?? [];
  const agg = [...(aggregate ?? []), ...filteredApiKeys];

  toast.message = `${agg.length} API keys`;

  if (cursor) {
    return await fetchAppSyncApiKeys(apiId, toast, cursor, agg);
  }

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded API keys";
  toast.message = `${agg.length} API keys`;
  return agg;
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
      const client = new AppSyncClient({});
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
      const client = new AppSyncClient({});
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

async function fetchAppSyncFunctions(
  apiId: string,
  toast: Toast,
  nextToken?: string,
  aggregate?: FunctionConfiguration[],
): Promise<FunctionConfiguration[]> {
  const client = new AppSyncClient({});
  const { functions, nextToken: cursor } = await client.send(new ListFunctionsCommand({ apiId, nextToken }));

  const filteredFunctions = functions ?? [];
  const agg = [...(aggregate ?? []), ...filteredFunctions];

  toast.message = `${agg.length} functions`;

  if (cursor) {
    return await fetchAppSyncFunctions(apiId, toast, cursor, agg);
  }

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded functions";
  toast.message = `${agg.length} functions`;
  return agg;
}
