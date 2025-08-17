export declare function createClient({
  url,
  fetch,
  googleToken,
}: {
  url: string;
  fetch?: any;
  googleToken: () => string;
}): {
  spiceblow: {
    api: {
      openapi: {
        get: (
          options?:
            | {
                headers?: Record<string, unknown> | undefined;
                query?: Record<string, unknown> | undefined;
                fetch?: RequestInit | undefined;
              }
            | undefined,
        ) => Promise<
          import("spiceflow/client").SpiceflowClient.ClientResponse<{
            [x: number]: any;
            200: any;
          }>
        >;
      };
      checkLicense: {
        post: (
          body?: unknown,
          options?:
            | {
                headers?: Record<string, unknown> | undefined;
                query?: Record<string, unknown> | undefined;
                fetch?: RequestInit | undefined;
              }
            | undefined,
        ) => Promise<
          import("spiceflow/client").SpiceflowClient.ClientResponse<{
            200: {
              hasLicense: boolean;
            };
          }>
        >;
      };
      generateFilterFromText: {
        post: (
          body: {
            query: string;
            searchText: string;
            databaseType: "postgres" | "mysql";
            tableInfo: import("spiceblow-database/src/types").TableInfo;
            schema?: string | undefined;
            previousOutputs?:
              | {
                  error: string;
                  output: {
                    whereClause: string;
                    orderByClause: string | null;
                    groupBy: string | null;
                  };
                }[]
              | undefined;
            namespace?: string | undefined;
          },
          options?:
            | {
                headers?: Record<string, unknown> | undefined;
                query?: Record<string, unknown> | undefined;
                fetch?: RequestInit | undefined;
              }
            | undefined,
        ) => Promise<
          import("spiceflow/client").SpiceflowClient.ClientResponse<{
            200: {
              sqlClause: string;
            };
          }>
        >;
      };
      generateSqlQuery: {
        post: (
          body: {
            type: "list" | "time-series";
            databaseType: "postgres" | "mysql";
            schema: string;
            prompt: string;
            previousOutputs?:
              | {
                  error: string;
                  output: string;
                }[]
              | undefined;
            previousQuery?: string | undefined;
          },
          options?:
            | {
                headers?: Record<string, unknown> | undefined;
                query?: Record<string, unknown> | undefined;
                fetch?: RequestInit | undefined;
              }
            | undefined,
        ) => Promise<
          import("spiceflow/client").SpiceflowClient.ClientResponse<{
            200: AsyncGenerator<
              {
                sqlCode: string;
              },
              void,
              unknown
            >;
          }>
        >;
      };
      graph: {
        get: (
          options?:
            | {
                headers?: Record<string, unknown> | undefined;
                query?: Record<string, unknown> | undefined;
                fetch?: RequestInit | undefined;
              }
            | undefined,
        ) => Promise<
          import("spiceflow/client").SpiceflowClient.ClientResponse<{
            200: Response;
          }>
        >;
      };
      generateGraphUrl: {
        post: (
          body: {
            rowsData: import("spiceblow-database/src/types").GraphData;
          },
          options?:
            | {
                headers?: Record<string, unknown> | undefined;
                query?: Record<string, unknown> | undefined;
                fetch?: RequestInit | undefined;
              }
            | undefined,
        ) => Promise<
          import("spiceflow/client").SpiceflowClient.ClientResponse<{
            200: {
              url: string;
            };
          }>
        >;
      };
      health: {
        get: (
          options?:
            | {
                headers?: Record<string, unknown> | undefined;
                query?: Record<string, unknown> | undefined;
                fetch?: RequestInit | undefined;
              }
            | undefined,
        ) => Promise<
          import("spiceflow/client").SpiceflowClient.ClientResponse<{
            readonly 200: {
              ok: boolean;
            };
          }>
        >;
      };
      "sse-test": {
        get: (
          options?:
            | {
                headers?: Record<string, unknown> | undefined;
                query?: Record<string, unknown> | undefined;
                fetch?: RequestInit | undefined;
              }
            | undefined,
        ) => Promise<
          import("spiceflow/client").SpiceflowClient.ClientResponse<{
            200: AsyncGenerator<
              | "hello"
              | {
                  ok: boolean;
                },
              never,
              unknown
            >;
          }>
        >;
      };
      errorExample: {
        get: (
          options?:
            | {
                headers?: Record<string, unknown> | undefined;
                query?: Record<string, unknown> | undefined;
                fetch?: RequestInit | undefined;
              }
            | undefined,
        ) => Promise<
          import("spiceflow/client").SpiceflowClient.ClientResponse<{
            readonly 200: {
              ok: boolean;
            };
          }>
        >;
      };
    };
  };
};
