import { getPreferenceValues } from "@raycast/api";
import axios from "axios";

const TANA_URL = "https://europe-west1-tagr-prod.cloudfunctions.net/addToNode";

interface Preferences {
  nodeApiToken: string;
}

type TanaResponse = string | { err: string };

function getPreferences() {
  return getPreferenceValues<Preferences>();
}

export async function createNode(content: string) {
  const prefs = getPreferences();
  const res = await axios.get<TanaResponse>(TANA_URL, {
    headers: {
      authorization: `Bearer ${prefs.nodeApiToken}`,
    },
    params: {
      note: content,
    },
  });
  if (typeof res.data === "object" && res.data.err) {
    throw new Error(res.data.err);
  }
}
