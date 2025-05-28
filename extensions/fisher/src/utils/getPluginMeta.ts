/* eslint-disable no-useless-escape */
import { pluginRegistry } from "../data/registry";

export interface PluginMeta {
  name: string;
  description: string;
  url: string;
}

export const getPluginMeta = (pluginName: string): PluginMeta | undefined => {
  // First try exact match (owner/repo)
  const exact = pluginRegistry.find((plugin) => {
    const match = plugin.url.match(/github\.com\/([^\/]+\/[^\/]+)/);
    return match?.[1] === pluginName;
  });

  if (exact) return exact;

  // Fallback: try matching just the repository name (case-insensitive)
  const fallback = pluginRegistry.find((plugin) => {
    const match = plugin.url.match(/github\.com\/[^\/]+\/([^\/]+)/);
    return match?.[1].toLowerCase() === pluginName.toLowerCase().split("/").pop();
  });

  return fallback;
};
