import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import axios from "axios";

const { token } = getPreferenceValues<ExtensionPreferences>();
const baseURL = "https://api.digitalocean.com/v2";
const client = axios.create({
  baseURL,
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

export type ContainerRegistry = {
  name: string;
  created_at: string;
  region: string;
  storage_usage_bytes: number;
  storage_used_bytes_updated_at: string;
  subscription?: {
    tier: {
      name: string;
      slug: string;
      included_repositories: number;
      included_storage_bytes: number;
      allow_storage_overage: boolean;
      included_bandwidth_bytes: number;
      monthly_price_in_cents: number;
      storage_overage_price_in_cents: number;
    };
    created_at: string;
    updated_at: string;
  };
};

export type DatabaseCluster = {
  id: string;
  name: string;
  engine: "pg" | "mysql" | "mongodb" | "redis" | "kafka";
  version?: string;
  semantic_version?: string;
  num_nodes: number;
  size: string;
  region: string;
  status: "creating" | "online" | "resizing" | "migrating" | "forking";
  created_at?: string;
  private_network_uuid?: string;
  tags?: string[];
  db_names?: string[];
  connection?: {
    uri: string;
    database: string;
    host: string;
    port: number;
    user: string;
    password: string;
    ssl: boolean;
  };
  private_connection?: {
    uri: string;
    database: string;
    host: string;
    port: number;
    user: string;
    password: string;
    ssl: boolean;
  };
  users?: Array<{
    name: string;
    role?: "primary" | "normal";
    password?: string;
    access_cert?: string;
    access_key?: string;
  }>;
  maintenance_window?: {
    day: string;
    hour: string;
    pending?: boolean;
    description?: string[];
  };
  project_id?: string;
};

export type Domain = {
  name: string;
  ttl: number;
  zone_file: string;
};

export type DomainRecord = {
  id: number;
  type: string;
  name: string;
  data: string;
  priority?: string;
  port?: string;
  ttl: string;
  weight?: number;
  flags?: number;
  tag?: number;
};

export type Droplet = {
  id: number;
  name: string;
  memory: number;
  vcpus: number;
  disk: number;
  locked: boolean;
  status: "new" | "active" | "off" | "archive";
  created_at: string;
  features: string[];
  networks: {
    v4?: IPv4Address[];
    v6?: IPv6Address[];
  };
  region: Region;
  tags: string[];
  vpc_uuid?: string;
};

export type KubernetesCluster = {
  id: string;
  name: string;
  region: string;
  version: string;
  cluster_subnet: string;
  service_subnet: string;
  vpc_uuid: string;
  ipv4: string;
  endpoint: string;
  tags: string[];
  maintenance_policy: {
    start_time: string;
    duration: string;
    day: "any" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  };
  auto_upgrade: boolean;
  status: {
    status: "running" | "provisioning" | "degraded" | "error" | "deleted" | "upgrading" | "deleting";
    message: "string";
  };
  created_at: string;
  updated_at: string;
  surge_upgrade: boolean;
  ha: boolean;
  registry_enabled: boolean;
};

export type Region = {
  name: string;
  slug: string;
  features: string[];
  available: boolean;
  sizes: string[];
};

export type Repository = {
  registry_name: string;
  name: string;
  tag_count: number;
  manifest_count: number;
};

export type IPv4Address = {
  ip_address: string;
  netmask: string;
  gateway: string;
  type: "public" | "private";
};

export type IPv6Address = {
  ip_address: string;
  netmask: string;
  gateway: string;
  type: "public";
};

export type Project = {
  id: string;
  owner_uuid: string;
  owner_id: number;
  name: string;
  description?: string;
  purpose?: string;
  environment?: "Development" | "Staging" | "Production";
  created_at: string;
  updated_at: string;
  is_default: boolean;
};

const useAuthorizedFetch =
  <T, P extends string[] = []>(path: string | ((...params: P) => string)) =>
  (...params: P) =>
    useFetch<T>(`${baseURL}/${!params || !params.length || typeof path === "string" ? path : path(...params)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

export const useContainerRegistry = useAuthorizedFetch<{ registry: ContainerRegistry }>("registry");
export const useContainerRegistryRepositories = useAuthorizedFetch<{ repositories: Repository[] }, [string]>(
  (registry: string) => `registry/${registry}/repositoriesV2`,
);
export const useContainerRegistryRepositoryTags = useAuthorizedFetch<
  {
    tags: Array<{
      registry_name: string;
      repository: string;
      tag: string;
      manifest_digest: string;
      compressed_size_bytes: number;
      size_bytes: number;
      updated_at: string;
    }>;
  },
  [string, string]
>((registry: string, repository: string) => `registry/${registry}/repositories/${repository}/tags`);
export const useDatabaseClusters = useAuthorizedFetch<{ databases: DatabaseCluster[] }>("databases");
export const useDomains = useAuthorizedFetch<{ domains: Domain[] }>("domains");
export const useDomainRecords = useAuthorizedFetch<{ domain_records: DomainRecord[] }, [string]>(
  (domain: string) => `domains/${domain}/records?per_page=200`,
);
export const useDroplets = useAuthorizedFetch<{ droplets: Droplet[] }>(`droplets`);
export const useKubernetesClusters = useAuthorizedFetch<{ kubernetes_clusters: KubernetesCluster[] }>(
  "kubernetes/clusters",
);
export const useProjects = useAuthorizedFetch<{ projects: Project[] }>("projects");

export function useMutateDomainRecords(domain: string): {
  mutate: (record: Omit<DomainRecord, "id">) => Promise<{ domain_record: DomainRecord }>;
} {
  const { mutate } = useDomainRecords(domain);

  return {
    mutate: (record: Omit<DomainRecord, "id">) => {
      return mutate(
        client
          .post<{ domain_record: DomainRecord }>(`${baseURL}/domains/${domain}/records`, record)
          .then((res) => res.data),
      );
    },
  };
}
