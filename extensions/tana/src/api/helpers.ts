import { getPreferenceValues } from "@raycast/api";
import { TanaAPIHelper } from "./TanaAPIClient";

export const TANA_URL = "https://europe-west1-tagr-prod.cloudfunctions.net";

type Preferences = {
  workspaceApiToken: string;
};
export const prefs = getPreferenceValues<Preferences>();

export const createPlainNode = async (name: string): Promise<string> => {
  const helper = new TanaAPIHelper(prefs.workspaceApiToken);
  const tananode = await helper.createNode(
    {
      name,
    },
    // 'SCHEMA'
    // 'LIBRARY'
    "INBOX",
  );
  return tananode.name;
};
