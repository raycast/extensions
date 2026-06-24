import { APIPlainNode } from "../types/types";
import { createPreferenceClient, getTanaPreferences } from "./preferenceClient";

export const prefs = getTanaPreferences();

export const createPlainNode = async (
  node: APIPlainNode,
  targetNodeId: string,
  workspaceId = prefs.workspaceId ?? "",
): Promise<string> => {
  const client = createPreferenceClient(workspaceId);
  const result = await client.createNode(node, targetNodeId);
  return result.createdNodes[0].nodeId;
};
