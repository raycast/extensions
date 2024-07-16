// src/api.ts
import axios from "axios";
import { getApiKey } from "./utils/preferences";
import { getCachedData, setCachedData } from "./utils/cache";

const BASE_URL = "https://api.shodan.io";

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use(async (config) => {
  const apiKey = await getApiKey();
  config.params = { ...config.params, key: apiKey };
  return config;
});

export interface Method {
  name: string;
  description: string;
  category: string;
  execute: (params: Record<string, unknown>) => Promise<unknown>;
}

export interface PaginatedMethod extends Method {
  paginate: boolean;
}

export const methods: (Method | PaginatedMethod)[] = [
  {
    name: "Search Shodan",
    description: "Search Shodan using the same query syntax as the website",
    category: "Search Methods",
    paginate: true,
    execute: async (params: Record<string, unknown>) => {
      const response = await api.get("/shodan/host/search", { params });
      return response.data;
    },
  },
  {
    name: "Host Information",
    description: "Returns all services that have been found on the given host IP",
    category: "Search Methods",
    execute: async (params: Record<string, unknown>) => {
      if (typeof params.ip !== "string") {
        throw new Error("IP parameter is required and must be a string");
      }
      const response = await api.get(`/shodan/host/${params.ip}`);
      return response.data;
    },
  },
  {
    name: "List Search Facets",
    description: "Returns a list of facets that can be used to get a breakdown of the top values for a property.",
    category: "Search Methods",
    execute: async () => {
      const response = await api.get("/shodan/host/search/facets");
      return response.data;
    },
  },
  {
    name: "List Search Filters",
    description: "Returns a list of search filters that can be used in the search query.",
    category: "Search Methods",
    execute: async () => {
      const response = await api.get("/shodan/host/search/filters");
      return response.data;
    },
  },
  {
    name: "Search Tokens",
    description:
      "Determine which filters are being used by the query string and what parameters were provided to the filters.",
    category: "Search Methods",
    execute: async (params: Record<string, unknown>) => {
      const response = await api.get("/shodan/host/search/tokens", { params });
      return response.data;
    },
  },
  {
    name: "Request Scan",
    description: "Request Shodan to crawl an IP/ netblock",
    category: "On-Demand Scanning",
    execute: async (params: Record<string, unknown>) => {
      const response = await api.post("/shodan/scan", params);
      return response.data;
    },
  },
  {
    name: "Scan Internet",
    description: "Request Shodan to crawl the Internet for a specific port.",
    category: "On-Demand Scanning",
    execute: async (params: Record<string, unknown>) => {
      const response = await api.post("/shodan/scan/internet", params);
      return response.data;
    },
  },
  {
    name: "List Scans",
    description: "Returns a listing of all the on-demand scans that are currently active on the account.",
    category: "On-Demand Scanning",
    execute: async () => {
      const response = await api.get("/shodan/scans");
      return response.data;
    },
  },
  {
    name: "Get Scan Status",
    description: "Check the progress of a previously submitted scan request.",
    category: "On-Demand Scanning",
    execute: async (params: Record<string, unknown>) => {
      if (typeof params.id !== "string") {
        throw new Error("Scan ID parameter is required and must be a string");
      }
      const response = await api.get(`/shodan/scans/${params.id}`);
      return response.data;
    },
  },
  {
    name: "List All Ports",
    description: "Returns a list of port numbers that the crawlers are looking for.",
    category: "On-Demand Scanning",
    execute: async () => {
      const cacheKey = "shodan_all_ports";
      const cachedData = await getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      const response = await api.get("/shodan/ports");
      await setCachedData(cacheKey, response.data);
      return response.data;
    },
  },
  {
    name: "List All Protocols",
    description: "Returns an object containing all the protocols that can be used when launching an Internet scan.",
    category: "On-Demand Scanning",
    execute: async () => {
      const cacheKey = "shodan_all_protocols";
      const cachedData = await getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      const response = await api.get("/shodan/protocols");
      await setCachedData(cacheKey, response.data);
      return response.data;
    },
  },
  {
    name: "Create Alert",
    description:
      "Create a network alert for a defined IP/ netblock which can be used to subscribe to changes/ events that are discovered within that range.",
    category: "Network Alerts",
    execute: async (params: Record<string, unknown>) => {
      const response = await api.post("/shodan/alert", params);
      return response.data;
    },
  },
  {
    name: "List Alerts",
    description: "Returns a listing of all the network alerts that are currently active on the account.",
    category: "Network Alerts",
    execute: async () => {
      const response = await api.get("/shodan/alert/info");
      return response.data;
    },
  },
  {
    name: "Get Alert Info",
    description: "Returns the information about a specific network alert.",
    category: "Network Alerts",
    execute: async (params: Record<string, unknown>) => {
      if (typeof params.id !== "string") {
        throw new Error("Alert ID parameter is required and must be a string");
      }
      const response = await api.get(`/shodan/alert/${params.id}/info`);
      return response.data;
    },
  },
  {
    name: "Delete Alert",
    description: "Remove the specified network alert.",
    category: "Network Alerts",
    execute: async (params: Record<string, unknown>) => {
      if (typeof params.id !== "string") {
        throw new Error("Alert ID parameter is required and must be a string");
      }
      const response = await api.delete(`/shodan/alert/${params.id}`);
      return response.data;
    },
  },
  {
    name: "List Notifiers",
    description: "Get a list of all the notifiers that the user has created.",
    category: "Notifiers",
    execute: async () => {
      const response = await api.get("/notifier");
      return response.data;
    },
  },
  {
    name: "Create Notifier",
    description: "Create a new notification service endpoint.",
    category: "Notifiers",
    execute: async (params: Record<string, unknown>) => {
      const response = await api.post("/notifier", params);
      return response.data;
    },
  },
  {
    name: "Get Notifier Info",
    description: "Get information about a notifier.",
    category: "Notifiers",
    execute: async (params: Record<string, unknown>) => {
      if (typeof params.id !== "string") {
        throw new Error("Notifier ID parameter is required and must be a string");
      }
      const response = await api.get(`/notifier/${params.id}`);
      return response.data;
    },
  },
  {
    name: "Delete Notifier",
    description: "Remove the notification service.",
    category: "Notifiers",
    execute: async (params: Record<string, unknown>) => {
      if (typeof params.id !== "string") {
        throw new Error("Notifier ID parameter is required and must be a string");
      }
      const response = await api.delete(`/notifier/${params.id}`);
      return response.data;
    },
  },
  {
    name: "List Queries",
    description: "Obtain a list of search queries that users have saved in Shodan.",
    category: "Directory Methods",
    paginate: true,
    execute: async (params: Record<string, unknown>) => {
      const response = await api.get("/shodan/query", { params });
      return response.data;
    },
  },
  {
    name: "Search Queries",
    description: "Search the directory of search queries that users have saved in Shodan.",
    category: "Directory Methods",
    execute: async (params: Record<string, unknown>) => {
      const response = await api.get("/shodan/query/search", { params });
      return response.data;
    },
  },
  {
    name: "List Query Tags",
    description: "Obtain a list of popular tags for the saved search queries in Shodan.",
    category: "Directory Methods",
    execute: async () => {
      const response = await api.get("/shodan/query/tags");
      return response.data;
    },
  },
  {
    name: "List Datasets",
    description: "Get a list of available datasets.",
    category: "Bulk Data (Enterprise)",
    execute: async () => {
      const response = await api.get("/shodan/data");
      return response.data;
    },
  },
  {
    name: "List Dataset Files",
    description: "Get a list of files for a dataset.",
    category: "Bulk Data (Enterprise)",
    execute: async (params: Record<string, unknown>) => {
      if (typeof params.dataset !== "string") {
        throw new Error("Dataset parameter is required and must be a string");
      }
      const response = await api.get(`/shodan/data/${params.dataset}`);
      return response.data;
    },
  },
  {
    name: "Get Organization Info",
    description: "Get information about your organization.",
    category: "Manage Organization (Enterprise)",
    execute: async () => {
      const response = await api.get("/org");
      return response.data;
    },
  },
  {
    name: "Add Organization Member",
    description: "Add a Shodan user to the organization.",
    category: "Manage Organization (Enterprise)",
    execute: async (params: Record<string, unknown>) => {
      if (typeof params.user !== "string") {
        throw new Error("User parameter is required and must be a string");
      }
      const response = await api.put(`/org/member/${params.user}`, null, { params: { notify: params.notify } });
      return response.data;
    },
  },
  {
    name: "Remove Organization Member",
    description: "Remove a member from the organization.",
    category: "Manage Organization (Enterprise)",
    execute: async (params: Record<string, unknown>) => {
      if (typeof params.user !== "string") {
        throw new Error("User parameter is required and must be a string");
      }
      const response = await api.delete(`/org/member/${params.user}`);
      return response.data;
    },
  },
  {
    name: "Get Account Profile",
    description: "Returns information about the Shodan account linked to this API key.",
    category: "Account Methods",
    execute: async () => {
      const response = await api.get("/account/profile");
      return response.data;
    },
  },
  {
    name: "DNS Lookup",
    description: "Look up the IP address for the provided list of hostnames.",
    category: "DNS Methods",
    execute: async (params: Record<string, unknown>) => {
      const response = await api.get("/dns/resolve", { params });
      return response.data;
    },
  },
  {
    name: "Reverse DNS Lookup",
    description: "Look up the hostnames that have been defined for the given list of IP addresses.",
    category: "DNS Methods",
    execute: async (params: Record<string, unknown>) => {
      const response = await api.get("/dns/reverse", { params });
      return response.data;
    },
  },
  {
    name: "Domain Info",
    description: "Get all the subdomains and other DNS entries for the given domain.",
    category: "DNS Methods",
    execute: async (params: Record<string, unknown>) => {
      if (typeof params.domain !== "string") {
        throw new Error("Domain parameter is required and must be a string");
      }
      const response = await api.get(`/dns/domain/${params.domain}`);
      return response.data;
    },
  },
  {
    name: "HTTP Headers",
    description: "Shows the HTTP headers that your client sends when connecting to a webserver.",
    category: "Utility Methods",
    execute: async () => {
      const response = await api.get("/tools/httpheaders");
      return response.data;
    },
  },
  {
    name: "My IP Address",
    description: "Get your current IP address as seen from the Internet.",
    category: "Utility Methods",
    execute: async () => {
      const response = await api.get("/tools/myip");
      return response.data;
    },
  },
  {
    name: "API Plan Information",
    description: "Returns information about the API plan belonging to the given API key.",
    category: "API Status Methods",
    execute: async () => {
      const response = await api.get("/api-info");
      return response.data;
    },
  },
];

export function getMethodsByCategory(category: string): Method[] {
  return methods.filter((method) => method.category === category);
}
