import type { HttpMethod } from "./client";

export interface Preset {
  key: string;
  title: string;
  category: string;
  method: HttpMethod;
  path: string;
  description: string;
}

/**
 * Common OpenSearch commands. Presets that require an index (mapping, settings,
 * search, count, explain) are handled by the Search and API Explorer commands.
 */
export const PRESETS: Preset[] = [
  {
    key: "cluster-health",
    title: "Cluster Health",
    category: "Cluster",
    method: "GET",
    path: "/_cluster/health",
    description: "Overall cluster health status",
  },
  {
    key: "cluster-stats",
    title: "Cluster Stats",
    category: "Cluster",
    method: "GET",
    path: "/_cluster/stats",
    description: "Cluster-wide statistics",
  },
  {
    key: "cluster-settings",
    title: "Cluster Settings",
    category: "Cluster",
    method: "GET",
    path: "/_cluster/settings?include_defaults=true",
    description: "Persistent, transient, and default settings",
  },
  {
    key: "nodes",
    title: "Nodes",
    category: "Cluster",
    method: "GET",
    path: "/_nodes",
    description: "Node information",
  },
  {
    key: "tasks",
    title: "Tasks",
    category: "Cluster",
    method: "GET",
    path: "/_tasks?detailed=true",
    description: "Currently running tasks",
  },
  {
    key: "cat-indices",
    title: "Cat Indices",
    category: "Cat",
    method: "GET",
    path: "/_cat/indices?v&format=json&s=index",
    description: "List indices with docs, size, and health",
  },
  {
    key: "cat-shards",
    title: "Cat Shards",
    category: "Cat",
    method: "GET",
    path: "/_cat/shards?v&format=json",
    description: "Shard allocation across nodes",
  },
  {
    key: "cat-nodes",
    title: "Cat Nodes",
    category: "Cat",
    method: "GET",
    path: "/_cat/nodes?v&format=json",
    description: "Nodes with load, heap, and roles",
  },
  {
    key: "aliases",
    title: "Aliases",
    category: "Indices",
    method: "GET",
    path: "/_alias",
    description: "All index aliases",
  },
  {
    key: "index-templates",
    title: "Index Templates",
    category: "Indices",
    method: "GET",
    path: "/_index_template",
    description: "Composable index templates",
  },
  {
    key: "component-templates",
    title: "Component Templates",
    category: "Indices",
    method: "GET",
    path: "/_component_template",
    description: "Reusable component templates",
  },
  {
    key: "snapshot-repositories",
    title: "Snapshot Repositories",
    category: "Snapshot",
    method: "GET",
    path: "/_snapshot",
    description: "Configured snapshot repositories",
  },
  {
    key: "ism-policies",
    title: "ISM Policies",
    category: "Plugins",
    method: "GET",
    path: "/_plugins/_ism/policies",
    description: "Index State Management policies (OpenSearch equivalent of ILM)",
  },
];
