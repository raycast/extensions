import { createAliasStore } from "./createAliasStore";

const store = createAliasStore("betterAliasesConfigPath", "config.json");

export const getBetterAliasesPath = store.getPath;
export const loadBetterAliases = store.load;
export const loadBetterAliasesAsync = store.loadAsync;
export const addBetterAlias = store.add;
export const deleteBetterAlias = store.delete;
export const updateBetterAlias = store.update;

export const checkAliasExists = (alias: string): boolean => {
  const config = store.load();
  return alias in config;
};
