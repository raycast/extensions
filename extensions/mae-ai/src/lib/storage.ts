import { LocalStorage } from "@raycast/api";
import {
  deleteFromRegistry,
  mergeTools,
  saveToRegistry,
  Tool,
  ToolRegistry,
} from "./tools";

const registryKey = "pocket-ai.commands.v2";
const storageKey = "pocket-ai.tools.v1";
const legacyStorageKey = "mae-ai.tools.v1";

async function loadRegistry(): Promise<ToolRegistry> {
  const registry = await LocalStorage.getItem<string>(registryKey);
  if (registry) return JSON.parse(registry) as ToolRegistry;
  let raw = await LocalStorage.getItem<string>(storageKey);
  if (!raw) {
    raw = await LocalStorage.getItem<string>(legacyStorageKey);
  }
  return { tools: raw ? (JSON.parse(raw) as Tool[]) : [], deletedBuiltIns: [] };
}

export async function loadTools(): Promise<Tool[]> {
  const registry = await loadRegistry();
  return mergeTools(registry.tools, registry.deletedBuiltIns);
}

export async function loadDeletedTools(): Promise<Tool[]> {
  const registry = await loadRegistry();
  return mergeTools(registry.tools).filter((tool) =>
    registry.deletedBuiltIns.includes(tool.id),
  );
}

export async function saveTool(tool: Tool): Promise<void> {
  await LocalStorage.setItem(
    registryKey,
    JSON.stringify(saveToRegistry(await loadRegistry(), tool)),
  );
}

export async function removeTool(id: string): Promise<void> {
  await LocalStorage.setItem(
    registryKey,
    JSON.stringify(deleteFromRegistry(await loadRegistry(), id)),
  );
}

export async function restoreTool(id: string): Promise<void> {
  const registry = await loadRegistry();
  await LocalStorage.setItem(
    registryKey,
    JSON.stringify({
      ...registry,
      deletedBuiltIns: registry.deletedBuiltIns.filter((item) => item !== id),
    }),
  );
}
