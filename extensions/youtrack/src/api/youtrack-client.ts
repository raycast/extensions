import { getPreferenceValues } from "@raycast/api";
import { YouTrack } from "youtrack-client";

let instance: YouTrack | null = null;

function getYouTrackClient(prefs = getPreferenceValues()): YouTrack {
  if (!instance) {
    instance = YouTrack.client(prefs.instance, prefs.token);
  }
  return instance;
}

export default getYouTrackClient;
