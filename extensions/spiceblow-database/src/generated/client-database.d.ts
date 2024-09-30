export declare function createClient({ url, fetch, googleToken }: { url: string; fetch?: any; googleToken: string }): {
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
          import("spiceflow/client").SpiceflowClient.TreatyResponse<{
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
          import("spiceflow/client").SpiceflowClient.TreatyResponse<{
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
            tableInfo: import("search-database/src/types").TableInfo;
            schema?: string | undefined;
            exampleRow?: any;
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
          import("spiceflow/client").SpiceflowClient.TreatyResponse<{
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
          import("spiceflow/client").SpiceflowClient.TreatyResponse<{
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
          import("spiceflow/client").SpiceflowClient.TreatyResponse<{
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
          import("spiceflow/client").SpiceflowClient.TreatyResponse<{
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
          import("spiceflow/client").SpiceflowClient.TreatyResponse<{
            readonly 200: {
              ok: boolean;
            };
          }>
        >;
      };
    };
  };
};
