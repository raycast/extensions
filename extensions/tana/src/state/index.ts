import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { proxy, subscribe, useSnapshot } from "valtio";
import { parseStoredNodes, scopedStorageKey } from "./storage";

export type TanaLocalNode = {
  id: string;
  name: string;
};

export type SupertagNode = TanaLocalNode & {
  color?: string;
};

type TanaLocalState = {
  targetNodes: TanaLocalNode[];
  supertags: SupertagNode[];
};

export const tanaLocal = proxy<TanaLocalState>({
  targetNodes: [],
  supertags: [],
});

export function useTanaLocal() {
  return useSnapshot(tanaLocal);
}

export function addTargetNode(node: TanaLocalNode) {
  const existingNode = tanaLocal.targetNodes.find((n) => n.id === node.id);
  if (existingNode) {
    throw new Error(`Node already exists with name: ${existingNode.name}`);
  }
  tanaLocal.targetNodes.push(node);
}

export function deleteTargetNode(nodeId: string) {
  tanaLocal.targetNodes = tanaLocal.targetNodes.filter((n) => n.id !== nodeId);
}

export function updateTargetNode(nodeId: string, name: string) {
  const node = tanaLocal.targetNodes.find((n) => n.id === nodeId);
  if (node) {
    node.name = name;
  }
}

export function addSuperTag(node: SupertagNode) {
  const existingNode = tanaLocal.supertags.find((n) => n.id === node.id);
  if (existingNode) {
    throw new Error(`Supertag already exists with name: ${existingNode.name}`);
  }
  tanaLocal.supertags.push(node);
}

export function deleteSupertag(nodeId: string) {
  tanaLocal.supertags = tanaLocal.supertags.filter((n) => n.id !== nodeId);
}

export function updateSupertag(nodeId: string, values: Omit<SupertagNode, "id">) {
  const node = tanaLocal.supertags.find((n) => n.id === nodeId);
  if (node) {
    node.name = values.name;
    node.color = values.color;
  }
}

const configuredWorkspaceId = getPreferenceValues<{ workspaceId?: string }>().workspaceId ?? "";

export async function loadNodes(key: "targetNodes" | "supertags"): Promise<TanaLocalNode[]> {
  const scopedKey = scopedStorageKey(key, configuredWorkspaceId);
  const [scopedValue, legacyValue] = await Promise.all([
    LocalStorage.getItem<string>(scopedKey),
    LocalStorage.getItem<string>(key),
  ]);
  const nodes = parseStoredNodes(scopedValue ?? legacyValue);
  if (scopedValue === undefined && legacyValue !== undefined) {
    await LocalStorage.setItem(scopedKey, JSON.stringify(nodes));
  }
  return nodes;
}

async function loadInitialState() {
  const [targetNodes, supertags] = await Promise.all([loadNodes("targetNodes"), loadNodes("supertags")]);
  tanaLocal.targetNodes = targetNodes;
  tanaLocal.supertags = supertags;
}

let initialStatePromise: Promise<void> | undefined = undefined;

/**
 * Suspend until the initial state is loaded.
 */
export function useLoadInitialState() {
  if (!initialStatePromise) {
    initialStatePromise = loadInitialState();
    throw initialStatePromise;
  }
}

// Save state to Raycast LocalStorage on change
subscribe(tanaLocal, async () => {
  await Promise.all([
    LocalStorage.setItem(scopedStorageKey("targetNodes", configuredWorkspaceId), JSON.stringify(tanaLocal.targetNodes)),
    LocalStorage.setItem(scopedStorageKey("supertags", configuredWorkspaceId), JSON.stringify(tanaLocal.supertags)),
  ]);
});
