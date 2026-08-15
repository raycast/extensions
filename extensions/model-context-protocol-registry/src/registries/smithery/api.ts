import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { JSONSchema7 } from "json-schema";

export type GetServersResponse = {
  servers: Server[];
  pagination: Pagination;
};

export type Pagination = {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
};

export type Server = {
  qualifiedName: string;
  displayName: string;
  description: string;
  useCount: number;
  homepage: string;
  createdAt: string;
};

export type GetServerResponse = {
  qualifiedName: string;
  displayName: string;
  deploymentUrl: string;
  remote: boolean;
  security?: { scanPassed?: boolean };
  iconUrl?: string;
  connections: Array<Connection>;
  tools?: Array<Tool>;
};

export type Tool = {
  name: string;
  description?: string;
};

export type Connection = StdioConnection | WsConnection | HTTPConnection;

export type StdioConnection = {
  type: "stdio";
  configSchema: JSONSchema7;
  exampleConfig?: Record<string, unknown>;
  stdioFunction: string;
};

export type HTTPConnection = {
  type: "http";
  deploymentUrl: string;
  configSchema: JSONSchema7;
  exampleConfig?: Record<string, unknown>;
};

export type WsConnection = {
  type: "ws";
  deploymentUrl: string;
  configSchema: JSONSchema7;
  exampleConfig?: Record<string, unknown>;
};

const preferences: Preferences.SearchServers = getPreferenceValues();

export function useServers(searchText?: string, options: { filter?: { local?: boolean; remote?: boolean } } = {}) {
  const query = new Array<string>();
  if (options.filter?.local) {
    query.push("is:local");
  }
  if (options.filter?.remote) {
    query.push("is:remote");
  }
  if (searchText) {
    query.push(searchText);
  }

  return useFetch(
    (options) =>
      "https://registry.smithery.ai/servers?" +
      new URLSearchParams({
        q: query.join(" "),
        pageSize: "25",
        page: String(options.page + 1),
      }).toString(),
    {
      headers: {
        Authorization: `Bearer ${preferences.smitheryApiKey}`,
      },
      mapResult(result: GetServersResponse) {
        return {
          data: result.servers,
          hasMore: result.pagination.currentPage < result.pagination.totalPages,
        };
      },
      keepPreviousData: true,
      initialData: [],
    },
  );
}

export function useServerDetails(server: Server) {
  return useFetch<GetServerResponse>("https://registry.smithery.ai/servers/" + server.qualifiedName, {
    headers: {
      Authorization: `Bearer ${preferences.smitheryApiKey}`,
    },
  });
}
