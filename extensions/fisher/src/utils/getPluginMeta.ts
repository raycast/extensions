import { pluginRegistry } from "../data/registry";

export interface PluginMeta {
  name: string;
  description: string;
  url: string;
}

export const getPluginMeta = (pluginName: string): PluginMeta | undefined => {
  return pluginRegistry.find((plugin) => plugin.url.endsWith(`${pluginName}`));
};
