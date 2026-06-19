import { getPreferenceValues } from "@raycast/api";
import { MusicAssistantApi } from "./external-code/music-assistant-api";

export default async function executeApiCommand<T>(command: (api: MusicAssistantApi) => Promise<T>): Promise<T> {
  const { host, token } = getPreferenceValues<Preferences>();
  const api = new MusicAssistantApi();

  try {
    api.initialize(host, token);
    return await command(api);
  } finally {
    api.close();
  }
}
