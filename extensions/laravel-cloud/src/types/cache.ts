export interface Cache {
  id: string;
  type: "caches";
  attributes: {
    name: string;
    type: CacheType;
    status: CacheStatus;
    region: string;
    size: string;
    auto_upgrade_enabled: boolean;
    is_public: boolean;
    connection: {
      hostname: string | null;
      port: number | null;
      protocol: string;
      username: string | null;
      password: string | null;
    };
    created_at: string | null;
  };
  relationships?: {
    environments?: { data: { id: string; type: string }[] };
  };
}

export type CacheType = "upstash_redis" | "laravel_valkey";

export type CacheStatus = "creating" | "updating" | "available" | "deleting" | "deleted" | "unknown";

export interface CacheTypeOption {
  type: CacheType;
  label: string;
  regions: string[];
  sizes: { value: string; label: string }[];
  supports_auto_upgrade: boolean;
}
