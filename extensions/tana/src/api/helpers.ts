import { getPreferenceValues } from "@raycast/api";
import { TanaAPIHelper } from "./TanaAPIClient";
import { APIPlainNode } from "../types/types";

export const TANA_URL = "https://europe-west1-tagr-prod.cloudfunctions.net";

type Preferences = {
  workspaceApiToken: string;
};
export const prefs = getPreferenceValues<Preferences>();

export const createPlainNode = async (node: APIPlainNode, targetNodeId: string): Promise<string> => {
  const helper = new TanaAPIHelper(prefs.workspaceApiToken);
  const tananode = await helper.createNode(node, targetNodeId);
  return tananode.name;
};
